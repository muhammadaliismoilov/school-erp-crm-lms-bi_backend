import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { PlanCode } from '../billing.util';
import { PaymentPlanConfig } from './payment-plan-config.entity';

/**
 * Bitta to'lov rejasi uchun chegirma sozlamasi (config child). Har config'da
 * 4 qator: yearly_1x / split_2 / split_3 / monthly. Chegirma foiz yoki so'm.
 */
@Entity('payment_plan_rates')
@Index('uq_payment_plan_rate', ['configId', 'planCode'], { unique: true })
export class PaymentPlanRate extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'config_id', type: 'uuid' })
  configId: string;

  @ManyToOne(() => PaymentPlanConfig, (config) => config.rates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'config_id' })
  config: PaymentPlanConfig;

  @Column({ name: 'plan_code', type: 'varchar', length: 20 })
  planCode: PlanCode;

  @Column({ name: 'discount_type', type: 'varchar', length: 10, default: 'amount' })
  discountType: 'percent' | 'amount';

  @Column({ name: 'discount_value', type: 'numeric', precision: 14, scale: 2, default: 0 })
  discountValue: number;
}
