import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Contract } from './contract.entity';
import { PaymentMethod } from '../enums/contract-status.enum';

@Entity('payments')
@Index('idx_payments_transaction_id', ['transactionId'])
export class Payment extends UuidAuditEntity {
  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @ManyToOne(() => Contract, (contract) => contract.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ name: 'transaction_id', type: 'varchar', length: 160, nullable: true })
  transactionId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;
}
