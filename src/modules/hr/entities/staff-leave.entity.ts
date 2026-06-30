import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { LeaveStatus, LeaveType } from '../enums/hr.enums';
import { StaffMember } from './staff-member.entity';

@Entity('hr_staff_leaves')
@Index('idx_hr_staff_leaves_staff', ['staffMemberId'])
@Index('idx_hr_staff_leaves_status', ['status'])
export class StaffLeave extends UuidAuditEntity {
  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, (staff) => staff.leaves, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember: StaffMember;

  @Column({ type: 'enum', enum: LeaveType, default: LeaveType.ANNUAL })
  type: LeaveType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  /** Ta'til kunlari soni. */
  @Column({ type: 'integer', default: 0 })
  days: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;

  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.REQUESTED })
  status: LeaveStatus;
}
