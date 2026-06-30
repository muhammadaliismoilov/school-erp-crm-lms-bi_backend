import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { WorkSchedule } from './work-schedule.entity';

/** Hafta kuni (jadval kunlari uchun). */
export enum Weekday {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

/** Ish jadvalidagi bir kun (boshlanish/tugash + tushlik). */
@Entity('hr_work_schedule_days')
@Index('idx_hr_work_schedule_days_schedule', ['scheduleId'])
export class WorkScheduleDay extends UuidAuditEntity {
  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId: string;

  @ManyToOne(() => WorkSchedule, (schedule) => schedule.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: WorkSchedule;

  @Column({ type: 'enum', enum: Weekday })
  weekday: Weekday;

  /** `HH:mm` ko'rinishida. */
  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime?: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime?: string | null;

  @Column({ name: 'lunch_start', type: 'time', nullable: true })
  lunchStart?: string | null;

  @Column({ name: 'lunch_end', type: 'time', nullable: true })
  lunchEnd?: string | null;
}
