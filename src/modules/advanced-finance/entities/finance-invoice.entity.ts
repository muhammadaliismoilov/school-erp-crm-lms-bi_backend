import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('finance_invoices')
@Index('uq_finance_invoices_no', ['invoiceNo'], { unique: true })
@Index('idx_finance_invoices_student', ['studentId'])
@Index('idx_finance_invoices_contract', ['contractId'])
export class FinanceInvoice extends UuidAuditEntity {
  @Column({ name: 'invoice_no', type: 'varchar', length: 60 })
  invoiceNo: string;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId?: string | null;

  @Column({ name: 'contract_id', type: 'uuid', nullable: true })
  contractId?: string | null;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ name: 'amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
