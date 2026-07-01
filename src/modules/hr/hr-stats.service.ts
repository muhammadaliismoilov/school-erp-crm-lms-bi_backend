import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Candidate } from './entities/candidate.entity';
import { Interaction } from './entities/interaction.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffMember } from './entities/staff-member.entity';
import { Task } from './entities/task.entity';
import { Vacancy } from './entities/vacancy.entity';
import {
  AttendanceAction,
  CandidateStage,
  EmploymentStatus,
  InteractionStatus,
  LeaveStatus,
  TaskStatus,
  VacancyStatus,
} from './enums/hr.enums';

export interface HrStatsOverview {
  staff: { total: number; active: number; onLeaveToday: number; newThisMonth: number };
  attendance: { presentToday: number; activeStaff: number; rate: number };
  recruitment: { openVacancies: number; activeCandidates: number; hiredThisMonth: number };
  interactions: { total: number; completed: number };
  tasks: { total: number; done: number };
}

/** Nomzod recruitment «faol» bosqichlari (yakuniy HIRED/REJECTED emas). */
const ACTIVE_CANDIDATE_STAGES = [
  CandidateStage.NEW,
  CandidateStage.SCREENING,
  CandidateStage.INTERVIEW,
  CandidateStage.TEST,
  CandidateStage.OFFER,
];

/**
 * HR bosh sahifasi va «Statistika» ekrani uchun yig'ma ko'rsatkichlar. Barcha
 * sanoqlar `Promise.all` bilan parallel — 700–1000+ foydalanuvchida ham yagona
 * so'rovda tez ishlaydi. Hisoblar server vaqti (local) chegaralari asosida.
 */
@Injectable()
export class HrStatsService {
  constructor(
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    @InjectRepository(StaffLeave) private readonly leaves: Repository<StaffLeave>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Vacancy) private readonly vacancies: Repository<Vacancy>,
    @InjectRepository(Candidate) private readonly candidates: Repository<Candidate>,
    @InjectRepository(Interaction) private readonly interactions: Repository<Interaction>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  async overview(): Promise<HrStatsOverview> {
    const { today, monthStart, dayStart, dayEnd } = this.dateBounds();

    const [
      staffTotal,
      staffActive,
      onLeaveToday,
      newThisMonth,
      presentToday,
      openVacancies,
      activeCandidates,
      hiredThisMonth,
      interactionsTotal,
      interactionsCompleted,
      tasksTotal,
      tasksDone,
    ] = await Promise.all([
      this.staff.createQueryBuilder('s').where('s.deleted_at IS NULL').getCount(),
      this.staff
        .createQueryBuilder('s')
        .where('s.deleted_at IS NULL')
        .andWhere('s.status = :st', { st: EmploymentStatus.ACTIVE })
        .getCount(),
      this.distinctStaffOnLeave(today),
      this.staff
        .createQueryBuilder('s')
        .where('s.deleted_at IS NULL')
        .andWhere('s.hire_date >= :monthStart', { monthStart })
        .getCount(),
      this.distinctPresentToday(dayStart, dayEnd),
      this.vacancies
        .createQueryBuilder('v')
        .where('v.deleted_at IS NULL')
        .andWhere('v.status = :st', { st: VacancyStatus.OPEN })
        .getCount(),
      this.candidates
        .createQueryBuilder('c')
        .where('c.deleted_at IS NULL')
        .andWhere('c.stage IN (:...stages)', { stages: ACTIVE_CANDIDATE_STAGES })
        .getCount(),
      this.candidates
        .createQueryBuilder('c')
        .where('c.deleted_at IS NULL')
        .andWhere('c.stage = :st', { st: CandidateStage.HIRED })
        .andWhere('c.updated_at >= :monthStart', { monthStart })
        .getCount(),
      this.interactions.createQueryBuilder('i').where('i.deleted_at IS NULL').getCount(),
      this.interactions
        .createQueryBuilder('i')
        .where('i.deleted_at IS NULL')
        .andWhere('i.status = :st', { st: InteractionStatus.COMPLETED })
        .getCount(),
      this.tasks.createQueryBuilder('t').where('t.deleted_at IS NULL').getCount(),
      this.tasks
        .createQueryBuilder('t')
        .where('t.deleted_at IS NULL')
        .andWhere('t.status = :st', { st: TaskStatus.DONE })
        .getCount(),
    ]);

    const rate = staffActive > 0 ? Math.round((presentToday / staffActive) * 100) : 0;

    return {
      staff: { total: staffTotal, active: staffActive, onLeaveToday, newThisMonth },
      attendance: { presentToday, activeStaff: staffActive, rate },
      recruitment: { openVacancies, activeCandidates, hiredThisMonth },
      interactions: { total: interactionsTotal, completed: interactionsCompleted },
      tasks: { total: tasksTotal, done: tasksDone },
    };
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  /** Bugun tasdiqlangan ta'tilda bo'lgan noyob xodimlar soni. */
  private async distinctStaffOnLeave(today: string): Promise<number> {
    const row = await this.leaves
      .createQueryBuilder('l')
      .select('COUNT(DISTINCT l.staff_member_id)', 'c')
      .where('l.deleted_at IS NULL')
      .andWhere('l.status = :st', { st: LeaveStatus.APPROVED })
      .andWhere('l.start_date <= :today', { today })
      .andWhere('l.end_date >= :today', { today })
      .getRawOne<{ c: string }>();
    return Number(row?.c ?? 0);
  }

  /** Bugun kamida bir marta «kirish» qilgan noyob xodimlar soni. */
  private async distinctPresentToday(dayStart: Date, dayEnd: Date): Promise<number> {
    const row = await this.attendance
      .createQueryBuilder('ar')
      .select('COUNT(DISTINCT ar.staff_member_id)', 'c')
      .where('ar.deleted_at IS NULL')
      .andWhere('ar.action = :act', { act: AttendanceAction.CHECK_IN })
      .andWhere('ar.recorded_at >= :dayStart', { dayStart })
      .andWhere('ar.recorded_at < :dayEnd', { dayEnd })
      .getRawOne<{ c: string }>();
    return Number(row?.c ?? 0);
  }

  private dateBounds(): { today: string; monthStart: Date; dayStart: Date; dayEnd: Date } {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${dayStart.getFullYear()}-${pad(dayStart.getMonth() + 1)}-${pad(dayStart.getDate())}`;
    return { today, monthStart, dayStart, dayEnd };
  }
}
