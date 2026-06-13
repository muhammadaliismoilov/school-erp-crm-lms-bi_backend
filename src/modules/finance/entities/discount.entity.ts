import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { LocalizedText } from '../../../common/i18n/locale';
import { Contract } from './contract.entity';

@Entity('discounts')
export class Discount extends UuidAuditEntity {
  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  type: 'fixed' | 'percent';

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;
}
