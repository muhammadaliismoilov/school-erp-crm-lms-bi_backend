import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StaffMember } from './staff-member.entity';
import { Timesheet } from './timesheet.entity';
import { HrPaymentStatus } from '../enums/hr.enums';

/** HR "To'lovlar" — xodimlarga to'lovlar. */
@Entity('hr_payments')
@Index('idx_hr_payments_status', ['status'])
@Index('idx_hr_payments_staff', ['staffMemberId'])
export class HrPayment extends UuidAuditEntity {
  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate?: string | null;

  @Column({ type: 'enum', enum: HrPaymentStatus, default: HrPaymentStatus.PENDING })
  status: HrPaymentStatus;

  /** Bog'langan ish vaqti taqvimi (ixtiyoriy). */
  @Column({ name: 'timesheet_id', type: 'uuid', nullable: true })
  timesheetId?: string | null;

  @ManyToOne(() => Timesheet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'timesheet_id' })
  timesheet?: Timesheet | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
