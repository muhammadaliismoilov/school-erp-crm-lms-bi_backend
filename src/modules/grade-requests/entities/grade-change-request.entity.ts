import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Quarter } from '../../academic/entities/quarter.entity';
import { Subject } from '../../academic/entities/subject.entity';
import { Student } from '../../students/entities/student.entity';

/** Baho turi: kunlik baholash, kurs bahosi yoki choraklik baho. */
export enum GradeRequestKind {
  ASSESSMENT = 'assessment',
  COURSE = 'course',
  QUARTER = 'quarter',
}

/** So'rov holati: kutilmoqda → tasdiqlangan / rad etilgan. */
export enum GradeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * O'qituvchi yoki ota-ona tomonidan kiritilgan baho o'zgartirish so'rovi.
 * Tasdiqlanganda tegishli baho yozuvi (kunlik / choraklik / kurs imtihoni)
 * yangilanadi. Rad etilganda hech narsa o'zgarmaydi.
 */
@Entity('grade_change_requests')
@Index('idx_gcr_status', ['status'])
@Index('idx_gcr_kind', ['kind'])
@Index('idx_gcr_student', ['studentId'])
@Index('idx_gcr_subject', ['subjectId'])
export class GradeChangeRequest extends UuidAuditEntity {
  @Column({ type: 'enum', enum: GradeRequestKind })
  kind: GradeRequestKind;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ name: 'subject_id', type: 'uuid', nullable: true })
  subjectId?: string | null;

  @ManyToOne(() => Subject, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subject_id' })
  subject?: Subject | null;

  /** Choraklik baho so'rovi uchun chorak. Boshqa turlarda null. */
  @Column({ name: 'quarter_id', type: 'uuid', nullable: true })
  quarterId?: string | null;

  @ManyToOne(() => Quarter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'quarter_id' })
  quarter?: Quarter | null;

  /**
   * O'zgartirilayotgan baho yozuvining IDsi (JournalEntry / QuarterSubjectGrade
   * / ExamResult). Null bo'lsa tasdiqlashda yozuv topib qo'llab bo'lmaydi.
   */
  @Column({ name: 'target_entity_id', type: 'uuid', nullable: true })
  targetEntityId?: string | null;

  /** So'rov yaratilgan paytdagi joriy baho (snapshot). */
  @Column({ name: 'current_grade', type: 'numeric', precision: 6, scale: 2, nullable: true })
  currentGrade?: number | null;

  /** Talab qilinayotgan yangi baho. */
  @Column({ name: 'requested_grade', type: 'numeric', precision: 6, scale: 2 })
  requestedGrade: number;

  /** So'rov sababi (SO'ROV SABABI ustuni). */
  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: GradeRequestStatus, default: GradeRequestStatus.PENDING })
  status: GradeRequestStatus;

  /** So'rovni yaratgan foydalanuvchi. */
  @Column({ name: 'requested_by_id', type: 'uuid', nullable: true })
  requestedById?: string | null;

  /** So'rovni ko'rib chiqqan (tasdiqlagan/rad etgan) foydalanuvchi. */
  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  /** Ko'rib chiqishdagi izoh (rad etish sababi yoki tasdiq izohi). */
  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string | null;

  /** Tasdiqlanib, asosiy baho yozuviga qo'llanganligi. */
  @Column({ type: 'boolean', default: false })
  applied: boolean;
}
