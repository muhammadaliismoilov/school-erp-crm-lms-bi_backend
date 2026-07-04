import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { PayrollAdjustmentType } from '../enums/hr.enums';
import { StaffMember } from './staff-member.entity';

/**
 * Qo'lda bonus/jarima yozuvi — payroll dvigateli davr bo'yicha yig'ib
 * MANUAL_BONUS/PENALTY qatorlariga aylantiradi. Sabab MAJBURIY, kim
 * kiritgani saqlanadi; tegishli oylik tasdiqlangach o'zgartirib bo'lmaydi.
 */
@Entity('hr_payroll_adjustments')
@Index('idx_hr_padj_staff_period', ['staffMemberId', 'period'])
export class PayrollAdjustment extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember;

  /** Qaysi oyga tegishli — 'YYYY-MM' (Payroll.period bilan bir xil format). */
  @Column({ type: 'varchar', length: 7 })
  period: string;

  @Column({ type: 'enum', enum: PayrollAdjustmentType })
  type: PayrollAdjustmentType;

  /** Musbat summa; jarima dvigatelda manfiy qatorga aylanadi. */
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  /** Sabab — majburiy (auditsiz bonus/jarima bo'lmaydi). */
  @Column({ type: 'text' })
  reason: string;

  /** Kim kiritgan (user id) — javobgarlik izi. */
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string | null;
}
