import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Timesheet } from './timesheet.entity';
import { StaffMember } from './staff-member.entity';

/** Ish vaqti taqvimidagi bir xodim satri (ishlagan kun/soat). */
@Entity('hr_timesheet_lines')
@Index('idx_hr_timesheet_lines_timesheet', ['timesheetId'])
export class TimesheetLine extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'timesheet_id', type: 'uuid' })
  timesheetId: string;

  @ManyToOne(() => Timesheet, (timesheet) => timesheet.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timesheet_id' })
  timesheet?: Timesheet;

  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember;

  @Column({ name: 'worked_days', type: 'numeric', precision: 5, scale: 1, default: 0 })
  workedDays: number;

  @Column({ name: 'worked_hours', type: 'numeric', precision: 7, scale: 1, default: 0 })
  workedHours: number;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
