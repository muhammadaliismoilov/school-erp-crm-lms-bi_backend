import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { PayrollItemType } from '../enums/hr.enums';
import { Payroll } from './payroll.entity';

/**
 * Oylikning komponent qatori (itemized payslip). Har qator o'z manbasiga
 * havola saqlaydi (`sourceRef`) — "84 dars × 60 000" qayerdan kelgani har
 * doim isbotlanadi. `amount` imzoli: ushlab qolishlar manfiy yoziladi,
 * shunda netto = qatorlar yig'indisi.
 */
@Entity('hr_payroll_items')
@Index('idx_hr_payroll_items_payroll', ['payrollId'])
export class PayrollItem extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'payroll_id', type: 'uuid' })
  payrollId: string;

  @ManyToOne(() => Payroll, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_id' })
  payroll?: Payroll;

  @Column({ type: 'enum', enum: PayrollItemType })
  type: PayrollItemType;

  /** Miqdor (masalan o'tilgan darslar soni yoki rahbarlik kunlari); bo'lmasa null. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  quantity?: number | null;

  /** Hisoblashda ishlatilgan stavka SNAPSHOT'i (keyin stavka o'zgarsa ham qator o'zgarmaydi). */
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  rate?: number | null;

  /** Qator summasi, so'mda. Ushlab qolishlar MANFIY yoziladi. */
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  /** Manba havolasi (masalan {"adjustmentId": "..."} yoki {"sessions": 84}). */
  @Column({ name: 'source_ref', type: 'jsonb', nullable: true })
  sourceRef?: Record<string, unknown> | null;
}
