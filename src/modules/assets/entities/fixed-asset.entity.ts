import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('fixed_assets')
@Index('uq_fixed_assets_code', ['assetCode'], { unique: true })
export class FixedAsset extends UuidAuditEntity {
  @Column({ name: 'asset_code', type: 'varchar', length: 80 })
  assetCode: string;

  @Column({ name: 'name', type: 'varchar', length: 160 })
  name: string;

  @Column({ name: 'category', type: 'varchar', length: 80, nullable: true })
  category?: string | null;

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate?: string | null;

  @Column({ name: 'purchase_cost', type: 'numeric', precision: 14, scale: 2, default: 0 })
  purchaseCost: number;

  @Column({ name: 'current_value', type: 'numeric', precision: 14, scale: 2, default: 0 })
  currentValue: number;

  @Column({ name: 'location', type: 'varchar', length: 120, nullable: true })
  location?: string | null;

  @Column({ name: 'responsible_staff_id', type: 'uuid', nullable: true })
  responsibleStaffId?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
