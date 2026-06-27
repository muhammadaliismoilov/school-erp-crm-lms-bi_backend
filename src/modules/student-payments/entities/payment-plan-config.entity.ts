import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AcademicYear } from '../../academic/entities/academic-year.entity';
import { PaymentPlanRate } from './payment-plan-rate.entity';

/**
 * To'lov rejasi chegirma konfiguratsiyasi — maktab darajasida (global default).
 * Akademik yilga bog'lanishi mumkin (`academicYearId`); null bo'lsa umumiy default.
 * 4 reja chegirmasi child `PaymentPlanRate` qatorlarda saqlanadi.
 */
@Entity('payment_plan_configs')
@Index('uq_payment_plan_config_year', ['academicYearId'], { unique: true, where: '"academic_year_id" IS NOT NULL' })
export class PaymentPlanConfig extends UuidAuditEntity {
  @Column({ name: 'academic_year_id', type: 'uuid', nullable: true })
  academicYearId?: string | null;

  @ManyToOne(() => AcademicYear, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'academic_year_id' })
  academicYear?: AcademicYear | null;

  /** Invariant validatsiyasi va FE preview uchun etalon oylik tarif. */
  @Column({ name: 'reference_monthly_fee', type: 'numeric', precision: 14, scale: 2, default: 0 })
  referenceMonthlyFee: number;

  /**
   * Akademik yil sozlanmagan holatga fallback oylar soni (mas. 10).
   * Akademik yil bo'lsa undagi start/end ishlatiladi.
   */
  @Column({ name: 'fallback_months', type: 'smallint', default: 10 })
  fallbackMonths: number;

  @OneToMany(() => PaymentPlanRate, (rate) => rate.config, { cascade: true, eager: true })
  rates: PaymentPlanRate[];

  // ─── Egalik auditi ──────────────────────────────────────────────────────────

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'created_by_name', type: 'varchar', length: 160, nullable: true })
  createdByName?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @Column({ name: 'updated_by_name', type: 'varchar', length: 160, nullable: true })
  updatedByName?: string | null;
}
