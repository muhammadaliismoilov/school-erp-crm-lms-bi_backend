import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { HomeworkStatus } from '../enums/homework.enums';

@Entity('homework_assignments')
@Index(['classId', 'subjectId', 'dueDate'])
export class HomeworkAssignment extends UuidAuditEntity {
  @Column({ name: 'class_id', type: 'uuid' }) classId: string;
  @Column({ name: 'subject_id', type: 'uuid' }) subjectId: string;
  @Column({ name: 'teacher_id', type: 'uuid', nullable: true }) teacherId?: string | null;
  @Column({ length: 180 }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ name: 'due_date', type: 'timestamptz' }) dueDate: Date;
  @Column({ name: 'max_score', type: 'numeric', precision: 7, scale: 2, default: 100 }) maxScore: number;
  @Column({ type: 'enum', enum: HomeworkStatus, default: HomeworkStatus.DRAFT }) status: HomeworkStatus;
  @Column({ name: 'attachment_urls', type: 'jsonb', default: () => "'[]'" }) attachmentUrls: string[];
}
