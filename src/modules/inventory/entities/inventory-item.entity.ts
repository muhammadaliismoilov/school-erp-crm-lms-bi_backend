import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Room } from '../../settings/entities/room.entity';
import { InventoryItemStatus } from '../enums/inventory.enums';
import { InventoryCategory } from './inventory-category.entity';
import { InventoryTransaction } from './inventory-transaction.entity';

@Entity('inventory_items')
@Index('uq_inventory_items_asset_code_active', ['assetCode'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_inventory_items_category', ['categoryId'])
export class InventoryItem extends UuidAuditEntity {
  @Column({ name: 'asset_code', type: 'varchar', length: 60 }) assetCode: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ name: 'category_id', type: 'uuid', nullable: true }) categoryId?: string | null;
  @ManyToOne(() => InventoryCategory, (category) => category.items, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'category_id' }) category?: InventoryCategory | null;
  @Column({ name: 'room_id', type: 'uuid', nullable: true }) roomId?: string | null;
  @ManyToOne(() => Room, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'room_id' }) room?: Room | null;
  @Column({ name: 'purchase_date', type: 'date', nullable: true }) purchaseDate?: string | null;
  @Column({ name: 'purchase_price', type: 'numeric', precision: 14, scale: 2, default: 0 }) purchasePrice: number;
  @Column({ type: 'enum', enum: InventoryItemStatus, default: InventoryItemStatus.ACTIVE }) status: InventoryItemStatus;
  @Column({ type: 'text', nullable: true }) note?: string | null;
  @OneToMany(() => InventoryTransaction, (transaction) => transaction.item) transactions: InventoryTransaction[];
}
