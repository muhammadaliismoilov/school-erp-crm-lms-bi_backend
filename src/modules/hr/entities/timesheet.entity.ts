import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Department } from './department.entity';
import { TimesheetLine } from './timesheet-line.entity';
import { TimesheetStatus } from '../enums/hr.enums';

/** HR "Ish vaqti hisobi" — bo'lim/oy bo'yicha xodimlar taqvimi. */
@Entity('hr_timesheets')
@Index('idx_hr_timesheets_status', ['status'])
@Unique('uq_hr_timesheets_period', ['year', 'month', 'departmentId'])
export class Timesheet extends UuidAuditEntity {
  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'integer' })
  month: number;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @Column({ type: 'enum', enum: TimesheetStatus, default: TimesheetStatus.DRAFT })
  status: TimesheetStatus;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @OneToMany(() => TimesheetLine, (line) => line.timesheet, { cascade: true })
  lines: TimesheetLine[];
}
