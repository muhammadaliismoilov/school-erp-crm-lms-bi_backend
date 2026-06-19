import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Quarter } from '../../academic/entities/quarter.entity';
import { Subject } from '../../academic/entities/subject.entity';
import { Student } from '../../students/entities/student.entity';

/** O'quvchining bir chorak + fan bo'yicha yakuniy (choraklik) bahosi. */
@Entity('lms_quarter_subject_grades')
@Index('uq_lms_qsg_student_subject_quarter', ['studentId', 'subjectId', 'quarterId'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class QuarterSubjectGrade extends UuidAuditEntity {
  @Column({ name: 'student_id', type: 'uuid' }) studentId: string;
  @ManyToOne(() => Student, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: Student;
  @Column({ name: 'subject_id', type: 'uuid' }) subjectId: string;
  @ManyToOne(() => Subject, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'subject_id' }) subject: Subject;
  @Column({ name: 'quarter_id', type: 'uuid' }) quarterId: string;
  @ManyToOne(() => Quarter, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'quarter_id' }) quarter: Quarter;
  /** Choraklik 5 ballik baho (1–5). */
  @Column({ type: 'smallint', nullable: true }) grade?: number | null;
  /** Choraklik 100 ballik baho (0–100). */
  @Column({ type: 'smallint', nullable: true }) ball?: number | null;
  @Column({ type: 'text', nullable: true }) comment?: string | null;
}
