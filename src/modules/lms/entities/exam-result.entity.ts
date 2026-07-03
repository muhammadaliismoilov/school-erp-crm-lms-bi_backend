import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Student } from '../../students/entities/student.entity';
import { Exam } from './exam.entity';

@Entity('lms_exam_results')
@Index('uq_lms_exam_results_exam_student_active', ['examId', 'studentId'], { unique: true, where: 'deleted_at IS NULL' })
export class ExamResult extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'exam_id', type: 'uuid' }) examId: string;
  @ManyToOne(() => Exam, (exam) => exam.results, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'exam_id' }) exam: Exam;
  @Column({ name: 'student_id', type: 'uuid' }) studentId: string;
  @ManyToOne(() => Student, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: Student;
  @Column({ type: 'numeric', precision: 8, scale: 2 }) score: number;
  @Column({ type: 'text', nullable: true }) comment?: string | null;
}
