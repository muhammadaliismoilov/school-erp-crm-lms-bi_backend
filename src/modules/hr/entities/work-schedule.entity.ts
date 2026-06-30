import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { WorkScheduleDay } from './work-schedule-day.entity';

/** HR "Jadvallar" — ish jadvali shabloni (standart yoki maxsus). */
@Entity('hr_work_schedules')
@Index('idx_hr_work_schedules_standard', ['isStandard'])
export class WorkSchedule extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Standart ish jadvali hisoblanadimi. */
  @Column({ name: 'is_standard', type: 'boolean', default: false })
  isStandard: boolean;

  @OneToMany(() => WorkScheduleDay, (day) => day.schedule, { cascade: true })
  days: WorkScheduleDay[];
}
