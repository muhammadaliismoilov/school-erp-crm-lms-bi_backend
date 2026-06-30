import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AcademicYear } from '../../academic/entities/academic-year.entity';
import { User } from '../../identity/entities/user.entity';
import { TeacherSalaryStatus } from '../enums/salary-status.enum';

/**
 * O'qituvchining bir oylik maoshi (period = `YYYY-MM`).
 *
 * `completedLessons` — shu oyda `lms_lesson_schedules` da `status='completed'`
 * bo'lgan darslar soni; `computedAmount = completedLessons * ratePerLesson`.
 * Moliya xodimi qo'lda tuzatish kiritsa (`adjusted*`), `finalAmount` shularga
 * asoslanadi. `approved` holatda yozuv qotib qoladi va `transactionId` orqali
 * moliyaviy chiqimga bog'lanadi.
 */
@Entity('teacher_salaries')
@Index('uq_teacher_salaries_teacher_period', ['teacherId', 'period'], { unique: true })
@Index('idx_teacher_salaries_period', ['period'])
@Index('idx_teacher_salaries_status', ['status'])
export class TeacherSalary extends UuidAuditEntity {
  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ name: 'academic_year_id', type: 'uuid', nullable: true })
  academicYearId?: string | null;

  @ManyToOne(() => AcademicYear, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'academic_year_id' })
  academicYear?: AcademicYear | null;

  /** Maosh tegishli davr, `YYYY-MM` formatida (masalan, `2026-05`). */
  @Column({ type: 'varchar', length: 7 })
  period: string;

  /** Avtomatik sanalgan yakunlangan darslar soni. */
  @Column({ name: 'completed_lessons', type: 'integer', default: 0 })
  completedLessons: number;

  /** Hisob vaqtidagi dars stavkasi snapshot'i. */
  @Column({ name: 'rate_per_lesson', type: 'numeric', precision: 14, scale: 2, default: 0 })
  ratePerLesson: number;

  /** Avtomatik hisoblangan summa = completedLessons * ratePerLesson. */
  @Column({ name: 'computed_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  computedAmount: number;

  /** Qo'lda kiritilgan dars soni (mavjud bo'lsa hisobni almashtiradi). */
  @Column({ name: 'adjusted_lessons', type: 'integer', nullable: true })
  adjustedLessons?: number | null;

  /** Qo'lda kiritilgan yakuniy summa (mavjud bo'lsa hisobni almashtiradi). */
  @Column({ name: 'adjusted_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  adjustedAmount?: number | null;

  /** To'lovga ketadigan yakuniy summa (computed yoki adjusted asosida). */
  @Column({ name: 'final_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  finalAmount: number;

  /** Tuzatish sababi (qo'lda o'zgartirilganda majburiy). */
  @Column({ name: 'adjustment_reason', type: 'text', nullable: true })
  adjustmentReason?: string | null;

  @Column({ type: 'enum', enum: TeacherSalaryStatus, default: TeacherSalaryStatus.PENDING })
  status: TeacherSalaryStatus;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'approved_by_name', type: 'varchar', length: 160, nullable: true })
  approvedByName?: string | null;

  /** Tasdiqlangach yozilgan moliyaviy chiqim (transaction) IDsi. */
  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId?: string | null;
}
