import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { SubmissionStatus } from '../enums/homework.enums';

@Entity('homework_submissions')
@Index(['assignmentId', 'studentId'], { unique: true, where: 'deleted_at IS NULL' })
export class HomeworkSubmission extends UuidAuditEntity {
  @Column({ name: 'assignment_id', type: 'uuid' }) assignmentId: string;
  @Column({ name: 'student_id', type: 'uuid' }) studentId: string;
  @Column({ type: 'text', nullable: true }) answer?: string | null;
  @Column({ name: 'attachment_urls', type: 'jsonb', default: () => "'[]'" }) attachmentUrls: string[];
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true }) submittedAt?: Date | null;
  @Column({ type: 'numeric', precision: 7, scale: 2, nullable: true }) score?: number | null;
  @Column({ name: 'teacher_comment', type: 'text', nullable: true }) teacherComment?: string | null;
  @Column({ name: 'ai_feedback', type: 'text', nullable: true }) aiFeedback?: string | null;
  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.SUBMITTED }) status: SubmissionStatus;
}
