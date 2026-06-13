import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('asset_depreciations')
@Index('idx_asset_depreciations_asset', ['assetId'])
export class AssetDepreciation extends UuidAuditEntity {
  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @Column({ name: 'period', type: 'varchar', length: 7 })
  period: string;

  @Column({ name: 'amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'book_value', type: 'numeric', precision: 14, scale: 2, default: 0 })
  bookValue: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

}
