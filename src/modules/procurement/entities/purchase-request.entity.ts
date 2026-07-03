import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('purchase_requests')
@Index('uq_purchase_requests_no', ['requestNo'], { unique: true })
export class PurchaseRequest extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'request_no', type: 'varchar', length: 60 })
  requestNo: string;

  @Column({ name: 'requested_by_id', type: 'uuid', nullable: true })
  requestedById?: string | null;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @Column({ name: 'purpose', type: 'text' })
  purpose: string;

  @Column({ name: 'estimated_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  estimatedAmount: number;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
