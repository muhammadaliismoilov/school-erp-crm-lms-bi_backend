import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { PayrollStatus } from '../enums/hr.enums';
import { StaffMember } from './staff-member.entity';
import { PayrollItem } from './payroll-item.entity';

@Entity('hr_payrolls')
@Index('idx_hr_payrolls_staff', ['staffMemberId'])
@Index('idx_hr_payrolls_period', ['period'])
export class Payroll extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, (staff) => staff.payrolls, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember: StaffMember;

  @Column({ type: 'varchar', length: 7 })
  period: string;

  @Column({ name: 'base_amount', type: 'numeric', precision: 14, scale: 2 })
  baseAmount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  bonus: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  deduction: number;

  @Column({ name: 'net_amount', type: 'numeric', precision: 14, scale: 2 })
  netAmount: number;

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  /** Itemized komponent qatorlari (payslip) — dvigatel to'ldiradi. */
  @OneToMany(() => PayrollItem, (item) => item.payroll)
  items?: PayrollItem[];
}
