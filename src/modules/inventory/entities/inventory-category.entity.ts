import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity('inventory_categories')
@Index('uq_inventory_categories_code_active', ['code'], { unique: true, where: 'deleted_at IS NULL' })
export class InventoryCategory extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ type: 'varchar', length: 80 })
  name: string;
  @Column({ type: 'varchar', length: 40 })
  code: string;
  @Column({ type: 'text', nullable: true })
  description?: string | null;
  @OneToMany(() => InventoryItem, (item) => item.category)
  items: InventoryItem[];
}
