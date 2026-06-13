import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { LocalizedText } from '../../../common/i18n/locale';

@Entity('contract_types')
@Index('uq_contract_types_code', ['code'], { unique: true })
export class ContractType extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  code: string;

  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedText | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
