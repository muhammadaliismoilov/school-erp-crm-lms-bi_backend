import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { SessionType } from '../../common/enums/session-type.enum';
import { Subject } from '../academic/entities/subject.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { ClassSession } from './entities/class-session.entity';
import { SessionAttendance } from './entities/session-attendance.entity';

export interface HistorySessionItem {
  subjectName: string;
  sessionType: SessionType;
  startTime: string;
  status: AttendanceStatus;
  minutesLate: number | null;
}

export interface HistoryDay {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  dailyStatus: AttendanceStatus | null;
  sessions: HistorySessionItem[];
}

@Injectable()
export class AttendanceHistoryService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly dailyRecords: Repository<AttendanceRecord>,
    @InjectRepository(SessionAttendance)
    private readonly attendances: Repository<SessionAttendance>,
    @InjectRepository(ClassSession)
    private readonly sessions: Repository<ClassSession>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    private readonly tenant: TenantContextService,
  ) {}

  /** O'quvchining sana oralig'idagi tarixi: kunlik kirdi/chiqdi + har dars holati. */
  async studentHistory(studentId: string, from: string, to: string): Promise<HistoryDay[]> {
    // 1) Kunlik fizik yozuvlar.
    const daily = await this.dailyRecords.find({
      where: tenantWhere<AttendanceRecord>(
        this.tenant,
        { studentId, date: Between(from, to) },
        { branch: true },
      ),
    });

    // 2) Sessiya davomatlari (ClassSession bilan join qilib sana oralig'ida).
    const sessionRows = await applyTenantScope(
      this.attendances.createQueryBuilder('a'),
      'a',
      this.tenant,
      { branch: true },
    )
      .innerJoin(ClassSession, 's', 's.id = a.session_id')
      .where('a.student_id = :studentId', { studentId })
      .andWhere('s.date BETWEEN :from AND :to', { from, to })
      .andWhere('a.deleted_at IS NULL')
      .select('s.date', 'date')
      .addSelect('s.subject_id', 'subjectId')
      .addSelect('s.session_type', 'sessionType')
      .addSelect('s.start_time', 'startTime')
      .addSelect('a.status', 'status')
      .addSelect('a.minutes_late', 'minutesLate')
      .orderBy('s.date', 'DESC')
      .addOrderBy('s.start_time', 'ASC')
      .getRawMany<{
        date: string;
        subjectId: string;
        sessionType: SessionType;
        startTime: string;
        status: AttendanceStatus;
        minutesLate: number | null;
      }>();

    const subjectNames = await this.subjectNames(sessionRows.map((r) => r.subjectId));

    // 3) Sana bo'yicha birlashtiramiz.
    const byDate = new Map<string, HistoryDay>();
    const dateKey = (d: string) => d.slice(0, 10);

    for (const r of daily) {
      const key = dateKey(r.date);
      byDate.set(key, {
        date: key,
        checkInTime: r.checkInTime ?? null,
        checkOutTime: r.checkOutTime ?? null,
        dailyStatus: r.status ?? null,
        sessions: [],
      });
    }

    for (const s of sessionRows) {
      const key = dateKey(s.date);
      const day =
        byDate.get(key) ??
        byDate.set(key, { date: key, checkInTime: null, checkOutTime: null, dailyStatus: null, sessions: [] }).get(key)!;
      day.sessions.push({
        subjectName: subjectNames.get(s.subjectId) ?? '—',
        sessionType: s.sessionType,
        startTime: s.startTime,
        status: s.status,
        minutesLate: s.minutesLate ?? null,
      });
    }

    return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  private async subjectNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await this.subjects.find({ where: { id: In(unique) } });
    return new Map(rows.map((r) => [r.id, r.normalizedName ?? '—']));
  }
}
