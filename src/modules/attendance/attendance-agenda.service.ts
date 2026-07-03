import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { SessionType } from '../../common/enums/session-type.enum';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Subject } from '../academic/entities/subject.entity';
import { StaffMember } from '../hr/entities/staff-member.entity';
import { Teacher } from '../hr/entities/teacher.entity';
import { TimetableSlot } from '../timetable/entities/timetable-slot.entity';
import { ClassSession } from './entities/class-session.entity';
import { SessionAttendance } from './entities/session-attendance.entity';

/** O'qituvchi kun agendasidagi bitta dars/kurs. */
export interface AgendaItem {
  slotId: string;
  sessionId: string | null;
  status: SessionStatus; // sessiya ochilmagan bo'lsa 'scheduled'
  sessionType: SessionType;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  counts: Record<AttendanceStatus, number> | null; // ochilgan bo'lsa hisoblar
  total: number | null;
}

@Injectable()
export class AttendanceAgendaService {
  constructor(
    @InjectRepository(TimetableSlot)
    private readonly slots: Repository<TimetableSlot>,
    @InjectRepository(ClassSession)
    private readonly sessions: Repository<ClassSession>,
    @InjectRepository(SessionAttendance)
    private readonly attendances: Repository<SessionAttendance>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(SchoolClass)
    private readonly classes: Repository<SchoolClass>,
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
    @InjectRepository(StaffMember)
    private readonly staff: Repository<StaffMember>,
    private readonly tenant: TenantContextService,
  ) {}

  /** Foydalanuvchidan (login qilgan o'qituvchi) teacherId ni aniqlaydi. */
  async resolveTeacherId(userId: string): Promise<string | null> {
    const member = await this.staff.findOne({
      where: tenantWhere<StaffMember>(this.tenant, { userId }, { branch: true }),
      select: { id: true },
    });
    if (!member) return null;
    const teacher = await this.teachers.findOne({
      where: tenantWhere<Teacher>(this.tenant, { staffMemberId: member.id }, { branch: true }),
      select: { id: true },
    });
    return teacher?.id ?? null;
  }

  /** O'qituvchining berilgan sanadagi darslari + har birining davomat holati. */
  async agenda(date: string, teacherId: string): Promise<AgendaItem[]> {
    const isoWeekday = this.isoWeekday(date);
    const slots = await this.slots.find({
      where: tenantWhere<TimetableSlot>(this.tenant, { teacherId, weekday: isoWeekday }, { branch: true }),
      order: { startTime: 'ASC' },
    });
    if (slots.length === 0) return [];

    const slotIds = slots.map((s) => s.id);
    const sessions = await this.sessions.find({
      where: tenantWhere<ClassSession>(this.tenant, { date, slotId: In(slotIds) }, { branch: true }),
    });
    const sessionBySlot = new Map(sessions.map((s) => [s.slotId as string, s]));

    const sessionIds = sessions.map((s) => s.id);
    const countsBySession = await this.countsBySession(sessionIds);

    const subjectNames = await this.nameMap(this.subjects, slots.map((s) => s.subjectId), 'normalizedName');
    const classNames = await this.nameMap(this.classes, slots.map((s) => s.classId), 'name');

    return slots.map((slot) => {
      const session = sessionBySlot.get(slot.id) ?? null;
      const counts = session ? countsBySession.get(session.id) ?? this.emptyCounts() : null;
      return {
        slotId: slot.id,
        sessionId: session?.id ?? null,
        status: session?.status ?? SessionStatus.SCHEDULED,
        sessionType: slot.sessionType,
        subjectId: slot.subjectId,
        subjectName: subjectNames.get(slot.subjectId) ?? '—',
        classId: slot.classId,
        className: classNames.get(slot.classId) ?? '—',
        startTime: slot.startTime,
        endTime: slot.endTime,
        counts,
        total: counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null,
      };
    });
  }

  private async countsBySession(sessionIds: string[]): Promise<Map<string, Record<AttendanceStatus, number>>> {
    const result = new Map<string, Record<AttendanceStatus, number>>();
    if (sessionIds.length === 0) return result;
    const rows = await this.attendances
      .createQueryBuilder('a')
      .select('a.session_id', 'sessionId')
      .addSelect('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('a.session_id IN (:...ids)', { ids: sessionIds })
      .andWhere('a.deleted_at IS NULL')
      .groupBy('a.session_id')
      .addGroupBy('a.status')
      .getRawMany<{ sessionId: string; status: AttendanceStatus; count: string }>();
    for (const row of rows) {
      const counts = result.get(row.sessionId) ?? this.emptyCounts();
      counts[row.status] = Number.parseInt(row.count, 10);
      result.set(row.sessionId, counts);
    }
    return result;
  }

  private async nameMap<T extends { id: string }>(
    repo: Repository<T>,
    ids: string[],
    field: keyof T,
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await repo.find({ where: { id: In(unique) } as never });
    return new Map(rows.map((r) => [r.id, String(r[field] ?? '—')]));
  }

  private emptyCounts(): Record<AttendanceStatus, number> {
    return {
      [AttendanceStatus.PRESENT]: 0,
      [AttendanceStatus.ABSENT]: 0,
      [AttendanceStatus.LATE]: 0,
      [AttendanceStatus.EXCUSED]: 0,
      [AttendanceStatus.LEFT_EARLY]: 0,
    };
  }

  /** Sanadan ISO hafta kunini (Dushanba=1 … Yakshanba=7) chiqaradi. */
  private isoWeekday(date: string): number {
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    return dow === 0 ? 7 : dow;
  }
}
