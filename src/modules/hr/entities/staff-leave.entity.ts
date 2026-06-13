import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { LeaveStatus } from '../enums/hr.enums';
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

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'varchar', length: 120 })
  reason: string;

  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.REQUESTED })
  status: LeaveStatus;
}
