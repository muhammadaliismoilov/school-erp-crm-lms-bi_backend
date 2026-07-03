import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AttendanceSource } from '../../common/enums/attendance-source.enum';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { StudentStatus } from '../students/enums/student-status.enum';
import { Student } from '../students/entities/student.entity';
import { TimetableSlot } from '../timetable/entities/timetable-slot.entity';
import {
  ConfirmSessionDto,
  SessionAttendanceEntryDto,
  UpdateAttendanceEntryDto,
} from './dto/session-attendance.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { AttendanceSettings } from './entities/attendance-settings.entity';
import { ClassSession } from './entities/class-session.entity';
import { SessionAttendance } from './entities/session-attendance.entity';
import { SessionAttendanceAudit } from './entities/session-attendance-audit.entity';

interface ResolvedSettings {
  lateThresholdMinutes: number;
  correctionWindowMinutes: number;
}

/** Notifikatsiya (Bosqich D) uchun sessiya davomati o'zgarishi. */
export interface SessionAttendanceChange {
  studentId: string;
  sessionId: string;
  status: AttendanceStatus;
  minutesLate: number | null;
}

@Injectable()
export class SessionAttendanceService {
  constructor(
    @InjectRepository(ClassSession)
    private readonly sessions: Repository<ClassSession>,
    @InjectRepository(SessionAttendance)
    private readonly attendances: Repository<SessionAttendance>,
    @InjectRepository(SessionAttendanceAudit)
    private readonly audits: Repository<SessionAttendanceAudit>,
    @InjectRepository(TimetableSlot)
    private readonly slots: Repository<TimetableSlot>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(AttendanceRecord)
    private readonly dailyRecords: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceSettings)
    private readonly settingsRepo: Repository<AttendanceSettings>,
    private readonly tenant: TenantContextService,
  ) {}

  /**
   * Dars/kurs sessiyasini ochadi (yoki mavjudini qaytaradi) va birinchi ochilishda
   * turniket ma'lumotidan davomatni avtomatik oldindan to'ldiradi.
   */
  async openSession(slotId: string, date: string): Promise<{ session: ClassSession; roster: SessionAttendance[] }> {
    const slot = await this.slots.findOne({
      where: tenantWhere<TimetableSlot>(this.tenant, { id: slotId }, { branch: true }),
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi.');

    let session = await this.sessions.findOne({
      where: tenantWhere<ClassSession>(this.tenant, { slotId, date }, { branch: true }),
    });

    if (!session) {
      session = this.sessions.create({
        slotId,
        date,
        classId: slot.classId,
        subjectId: slot.subjectId,
        teacherId: slot.teacherId,
        sessionType: slot.sessionType,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: SessionStatus.OPEN,
      });
      session = await this.sessions.save(session);
      await this.prefill(session);
    } else if (session.status === SessionStatus.SCHEDULED) {
      session.status = SessionStatus.OPEN;
      session = await this.sessions.save(session);
      await this.prefill(session);
    }

    return { session, roster: await this.roster(session.id) };
  }

  /** Sessiya davomat ro'yxati (o'qituvchi UI uchun). */
  async roster(sessionId: string): Promise<SessionAttendance[]> {
    return this.attendances.find({
      where: tenantWhere<SessionAttendance>(this.tenant, { sessionId }, { branch: true }),
      order: { studentId: 'ASC' },
    });
  }

  /** O'qituvchi tasdiqlaydi; tuzatilgan yozuvlar MANUAL bo'lib, auditga tushadi. */
  async confirmSession(
    sessionId: string,
    dto: ConfirmSessionDto,
    userId: string,
  ): Promise<{ session: ClassSession; changes: SessionAttendanceChange[] }> {
    const session = await this.findSession(sessionId);
    if (session.status === SessionStatus.CANCELLED) {
      throw new BadRequestException('Bekor qilingan sessiyani tasdiqlab bo‘lmaydi.');
    }

    const changes: SessionAttendanceChange[] = [];
    for (const entry of dto.entries ?? []) {
      const change = await this.applyEntry(session, entry, userId, 'O‘qituvchi tasdig‘i');
      if (change) changes.push(change);
    }

    session.status = SessionStatus.CONFIRMED;
    session.confirmedByTeacherId = userId;
    session.confirmedAt = new Date();
    await this.sessions.save(session);

    return { session, changes };
  }

  /**
   * Yagona o'quvchi davomatini tuzatadi (kechikkanni keyin qo'shish ham shu yerda).
   * Tasdiqlangandan keyin faqat tuzatish oynasi ichida ruxsat etiladi.
   */
  async updateAttendance(
    sessionId: string,
    studentId: string,
    dto: UpdateAttendanceEntryDto,
    userId: string,
  ): Promise<{ attendance: SessionAttendance; change: SessionAttendanceChange | null }> {
    const session = await this.findSession(sessionId);
    await this.assertCorrectionAllowed(session);

    const change = await this.applyEntry(
      session,
      { studentId, status: dto.status, minutesLate: dto.minutesLate, note: dto.note },
      userId,
      dto.reason ?? 'Tuzatish',
    );
    const attendance = await this.attendances.findOneOrFail({
      where: tenantWhere<SessionAttendance>(this.tenant, { sessionId, studentId }, { branch: true }),
    });
    return { attendance, change };
  }

  /** O'qituvchining sana bo'yicha sessiyalari. */
  async listSessions(date: string, teacherId?: string): Promise<ClassSession[]> {
    const where = tenantWhere<ClassSession>(this.tenant, { date }, { branch: true });
    if (teacherId) (where as Record<string, unknown>).teacherId = teacherId;
    return this.sessions.find({ where, order: { startTime: 'ASC' } });
  }

  // --- ichki mantiq ---------------------------------------------------------

  private async findSession(sessionId: string): Promise<ClassSession> {
    const session = await this.sessions.findOne({
      where: tenantWhere<ClassSession>(this.tenant, { id: sessionId }, { branch: true }),
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi.');
    return session;
  }

  /** Turniket (kunlik yozuv) asosida barcha o'quvchilar uchun default davomat. */
  private async prefill(session: ClassSession): Promise<void> {
    const settings = await this.resolveSettings();
    const roster = await this.students.find({
      where: tenantWhere<Student>(
        this.tenant,
        { currentClassId: session.classId, status: StudentStatus.ACTIVE },
        { branch: true },
      ),
      select: { id: true },
    });
    if (roster.length === 0) return;

    const studentIds = roster.map((s) => s.id);
    const records = await this.dailyRecords.find({
      where: tenantWhere<AttendanceRecord>(this.tenant, { date: session.date, studentId: In(studentIds) }, { branch: true }),
    });
    const byStudent = new Map(records.map((r) => [r.studentId, r]));

    const startMin = this.toMinutes(session.startTime);
    const endMin = this.toMinutes(session.endTime);

    const rows = studentIds.map((studentId) => {
      const record = byStudent.get(studentId);
      const { status, minutesLate } = this.deriveDefault(record, startMin, endMin, settings.lateThresholdMinutes);
      return {
        sessionId: session.id,
        studentId,
        status,
        minutesLate,
        source: AttendanceSource.AUTO,
        schoolId: session.schoolId ?? null,
        filialId: session.filialId ?? null,
      };
    });

    // Takroriy ochishda mavjud yozuvlarni buzmaymiz.
    await this.attendances.createQueryBuilder().insert().values(rows).orIgnore().execute();
  }

  /** Kunlik kirish/chiqishdan sessiya darajasidagi default holatni chiqaradi. */
  private deriveDefault(
    record: AttendanceRecord | undefined,
    startMin: number,
    endMin: number,
    lateThreshold: number,
  ): { status: AttendanceStatus; minutesLate: number | null } {
    if (!record || !record.checkInTime) {
      return { status: AttendanceStatus.ABSENT, minutesLate: null };
    }
    const checkInMin = this.toMinutes(record.checkInTime);
    // Dars boshlanishidan oldin chiqib ketgan bo'lsa — yo'q.
    if (record.checkOutTime && this.toMinutes(record.checkOutTime) <= startMin) {
      return { status: AttendanceStatus.ABSENT, minutesLate: null };
    }
    if (checkInMin <= startMin + lateThreshold) {
      return { status: AttendanceStatus.PRESENT, minutesLate: null };
    }
    if (checkInMin <= endMin) {
      return { status: AttendanceStatus.LATE, minutesLate: checkInMin - startMin };
    }
    // Dars tugagandan keyin kelgan — bu darsda yo'q.
    return { status: AttendanceStatus.ABSENT, minutesLate: null };
  }

  /** Yagona yozuvni qo'llaydi (yo'q bo'lsa yaratadi), o'zgarish bo'lsa auditga yozadi. */
  private async applyEntry(
    session: ClassSession,
    entry: SessionAttendanceEntryDto,
    userId: string,
    reason: string,
  ): Promise<SessionAttendanceChange | null> {
    const existing = await this.attendances.findOne({
      where: tenantWhere<SessionAttendance>(this.tenant, { sessionId: session.id, studentId: entry.studentId }, { branch: true }),
    });

    const nextMinutesLate = entry.status === AttendanceStatus.LATE ? entry.minutesLate ?? existing?.minutesLate ?? null : null;

    if (!existing) {
      // Kechikkan/qo'shilgan o'quvchi — yangi yozuv.
      const created = this.attendances.create({
        sessionId: session.id,
        studentId: entry.studentId,
        status: entry.status,
        minutesLate: nextMinutesLate,
        source: AttendanceSource.MANUAL,
        note: entry.note ?? null,
        schoolId: session.schoolId ?? null,
        filialId: session.filialId ?? null,
      });
      const saved = await this.attendances.save(created);
      await this.writeAudit(saved.id, userId, null, null, entry.status, nextMinutesLate, reason);
      return { studentId: entry.studentId, sessionId: session.id, status: entry.status, minutesLate: nextMinutesLate };
    }

    const unchanged = existing.status === entry.status && (existing.minutesLate ?? null) === nextMinutesLate;
    if (unchanged) return null;

    const oldStatus = existing.status;
    const oldMinutes = existing.minutesLate ?? null;
    existing.status = entry.status;
    existing.minutesLate = nextMinutesLate;
    existing.source = AttendanceSource.MANUAL;
    if (entry.note !== undefined) existing.note = entry.note ?? null;
    await this.attendances.save(existing);
    await this.writeAudit(existing.id, userId, oldStatus, oldMinutes, entry.status, nextMinutesLate, reason);

    return { studentId: entry.studentId, sessionId: session.id, status: entry.status, minutesLate: nextMinutesLate };
  }

  private async writeAudit(
    attendanceId: string,
    userId: string,
    oldStatus: AttendanceStatus | null,
    oldMinutes: number | null,
    newStatus: AttendanceStatus,
    newMinutes: number | null,
    reason: string,
  ): Promise<void> {
    await this.audits.save(
      this.audits.create({
        attendanceId,
        changedByUserId: userId,
        oldStatus,
        oldMinutesLate: oldMinutes,
        newStatus,
        newMinutesLate: newMinutes,
        reason,
      }),
    );
  }

  /** Tasdiqlangandan keyin tuzatish oynasi tekshiruvi. */
  private async assertCorrectionAllowed(session: ClassSession): Promise<void> {
    if (session.status !== SessionStatus.CONFIRMED || !session.confirmedAt) return; // ochiq — erkin.
    const settings = await this.resolveSettings();
    const elapsedMin = (Date.now() - session.confirmedAt.getTime()) / 60000;
    if (elapsedMin > settings.correctionWindowMinutes) {
      throw new ForbiddenException('Tuzatish oynasi yopilgan — faqat administrator tuzata oladi.');
    }
  }

  private async resolveSettings(): Promise<ResolvedSettings> {
    const row = await this.settingsRepo.findOne({
      where: tenantWhere<AttendanceSettings>(this.tenant, {}, { branch: true }),
    });
    return {
      lateThresholdMinutes: row?.lateThresholdMinutes ?? 5,
      correctionWindowMinutes: row?.correctionWindowMinutes ?? 720,
    };
  }

  /** 'HH:MM' yoki 'HH:MM:SS' → daqiqa. */
  private toMinutes(time: string): number {
    const [h, m] = time.split(':');
    return Number.parseInt(h, 10) * 60 + Number.parseInt(m, 10);
  }
}
