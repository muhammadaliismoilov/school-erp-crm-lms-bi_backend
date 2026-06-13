import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('bank_accounts')
@Index('uq_bank_accounts_number', ['accountNumber'], { unique: true })
export class BankAccount extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'account_number', type: 'varchar', length: 64 })
  accountNumber: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 160 })
  bankName: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  mfo?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  stir?: string | null;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
