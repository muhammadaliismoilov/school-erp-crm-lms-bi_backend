import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('purchase_orders')
@Index('uq_purchase_orders_no', ['orderNo'], { unique: true })
@Index('idx_purchase_orders_vendor', ['vendorId'])
@Index('idx_purchase_orders_request', ['requestId'])
export class PurchaseOrder extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'order_no', type: 'varchar', length: 60 })
  orderNo: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId?: string | null;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
