import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Student } from '../../students/entities/student.entity';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractType } from './contract-type.entity';
import { PaymentPlan } from './payment-plan.entity';
import { Payment } from './payment.entity';

@Entity('contracts')
@Index('idx_contracts_school', ['schoolId'])
@Index('idx_contracts_filial', ['filialId'])
export class Contract extends UuidAuditEntity {
  /** Maktab (qattiq tenant chegarasi). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  /** Filial (branch). */
  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'contract_type_id', type: 'uuid' })
  contractTypeId: string;

  @ManyToOne(() => ContractType)
  @JoinColumn({ name: 'contract_type_id' })
  contractType: ContractType;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl?: string | null;

  @OneToMany(() => PaymentPlan, (paymentPlan) => paymentPlan.contract)
  paymentPlans: PaymentPlan[];

  @OneToMany(() => Payment, (payment) => payment.contract)
  payments: Payment[];
}
