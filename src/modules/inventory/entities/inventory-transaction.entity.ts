import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { InventoryTransactionType } from '../enums/inventory.enums';
import { InventoryItem } from './inventory-item.entity';

@Entity('inventory_transactions')
@Index('idx_inventory_transactions_item', ['itemId'])
@Index('idx_inventory_transactions_type', ['type'])
export class InventoryTransaction extends UuidAuditEntity {
  @Column({ name: 'item_id', type: 'uuid' }) itemId: string;
  @ManyToOne(() => InventoryItem, (item) => item.transactions, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'item_id' }) item: InventoryItem;
  @Column({ type: 'enum', enum: InventoryTransactionType }) type: InventoryTransactionType;
  @Column({ type: 'int', default: 1 }) quantity: number;
  @Column({ name: 'performed_at', type: 'timestamptz', default: () => 'now()' }) performedAt: Date;
  @Column({ type: 'text', nullable: true }) comment?: string | null;
}
