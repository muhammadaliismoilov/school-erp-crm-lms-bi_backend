import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { BankAccount } from './bank-account.entity';

@Entity('transactions')
export class FinanceTransaction extends UuidAuditEntity {
  @Column({ name: 'source_type', type: 'varchar', length: 80 })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId?: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 20 })
  type: 'income' | 'expense';

  @Column({ type: 'varchar', length: 40 })
  method: string;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId?: string | null;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount?: BankAccount | null;
}
