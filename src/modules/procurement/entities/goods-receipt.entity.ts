import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('goods_receipts')
@Index('uq_goods_receipts_no', ['receiptNo'], { unique: true })
@Index('idx_goods_receipts_po', ['purchaseOrderId'])
export class GoodsReceipt extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'receipt_no', type: 'varchar', length: 60 })
  receiptNo: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: string;

  @Column({ name: 'received_by_id', type: 'uuid', nullable: true })
  receivedById?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
