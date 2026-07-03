import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('bank_transactions')
@Index('uq_bank_transactions_no', ['transactionNo'], { unique: true })
@Index('idx_bank_transactions_payment', ['matchedPaymentId'])
export class BankTransaction extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'transaction_no', type: 'varchar', length: 100 })
  transactionNo: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 120, nullable: true })
  bankName?: string | null;

  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate: string;

  @Column({ name: 'amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'direction', type: 'varchar', length: 20 })
  direction: string;

  @Column({ name: 'matched_payment_id', type: 'uuid', nullable: true })
  matchedPaymentId?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
