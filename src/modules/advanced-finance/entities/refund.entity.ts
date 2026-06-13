import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('refunds')
@Index('idx_refunds_payment', ['paymentId'])
@Index('idx_refunds_student', ['studentId'])
export class Refund extends UuidAuditEntity {
  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId?: string | null;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId?: string | null;

  @Column({ name: 'amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: string | null;

}
