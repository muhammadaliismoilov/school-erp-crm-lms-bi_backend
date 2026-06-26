import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { SchoolClass } from '../../academic/entities/school-class.entity';
import { Student } from '../../students/entities/student.entity';
import { PaymentType } from '../../transactions/entities/payment-type.entity';

/** O'quvchi to'lovi holati (rasmdagi "HOLAT" ustuni). */
export enum StudentPaymentStatus {
  /** To'liq to'langan (amount ≥ reja). */
  PAID = 'paid',
  /** Qisman to'langan (0 < amount < reja). */
  PARTIAL = 'partial',
  /** Kutilmoqda (amount = 0). */
  PENDING = 'pending',
}

/**
 * O'quvchi to'lovi ("To'lovlar" sahifasi). Har bir yozuv — bitta o'quvchining
 * bir oy uchun to'lovi: to'langan summa (`amount`), kutilgan reja (`planAmount`),
 * to'lov turi, kvitansiya raqami va holat. O'quvchi/sinf nomlari snapshot sifatida
 * saqlanadi (yozuv tarixi o'quvchi ko'chgan/o'chgan keyin ham buzilmasin).
 */
@Entity('student_payments')
@Index('idx_student_payments_student', ['studentId'])
@Index('idx_student_payments_class', ['classId'])
@Index('idx_student_payments_date', ['paymentDate'])
@Index('idx_student_payments_period', ['year', 'month'])
@Index('idx_student_payments_status', ['status'])
export class StudentPayment extends UuidAuditEntity {
  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId?: string | null;

  @ManyToOne(() => Student, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'student_id' })
  student?: Student | null;

  /** O'quvchi to'liq ismi — snapshot. */
  @Column({ name: 'student_name', type: 'varchar', length: 160 })
  studentName: string;

  @Column({ name: 'class_id', type: 'uuid', nullable: true })
  classId?: string | null;

  @ManyToOne(() => SchoolClass, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class?: SchoolClass | null;

  /** Sinf nomi — snapshot. */
  @Column({ name: 'class_name', type: 'varchar', length: 80, nullable: true })
  className?: string | null;

  /** To'langan summa (rasmdagi "SUMMA"). */
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: number;

  /** Oylik reja summasi — kutilgan to'lov (qoldiqni hisoblash uchun). */
  @Column({ name: 'plan_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  planAmount?: number | null;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'smallint' })
  year: number;

  /** To'lov turi (Naqd, Karta, O'tkazma ...). */
  @Column({ name: 'payment_type_id', type: 'uuid', nullable: true })
  paymentTypeId?: string | null;

  @ManyToOne(() => PaymentType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_type_id' })
  paymentType?: PaymentType | null;

  /** Kvitansiya raqami — avtomatik (KV-YYYY-NNNNN), unikal. */
  @Column({ name: 'receipt_number', type: 'varchar', length: 40, unique: true })
  receiptNumber: string;

  @Column({ type: 'enum', enum: StudentPaymentStatus, default: StudentPaymentStatus.PENDING })
  status: StudentPaymentStatus;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  // ─── Egalik auditi: kim yaratdi / kim oxirgi o'zgartirdi (snapshot) ──────────

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'created_by_name', type: 'varchar', length: 160, nullable: true })
  createdByName?: string | null;

  @Column({ name: 'created_by_role', type: 'varchar', length: 60, nullable: true })
  createdByRole?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @Column({ name: 'updated_by_name', type: 'varchar', length: 160, nullable: true })
  updatedByName?: string | null;

  @Column({ name: 'updated_by_role', type: 'varchar', length: 60, nullable: true })
  updatedByRole?: string | null;
}
