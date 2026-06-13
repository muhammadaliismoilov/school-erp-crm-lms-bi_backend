import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { FeedbackStatus, FeedbackType } from '../enums/feedback.enums';
@Entity('feedback_tickets')
@Index(['status', 'type'])
export class FeedbackTicket extends UuidAuditEntity {
  @Column({ type: 'enum', enum: FeedbackType, default: FeedbackType.MESSAGE }) type: FeedbackType;
  @Column({ type: 'enum', enum: FeedbackStatus, default: FeedbackStatus.NEW }) status: FeedbackStatus;
  @Column({ name: 'sender_id', type: 'uuid', nullable: true }) senderId?: string | null;
  @Column({ name: 'student_id', type: 'uuid', nullable: true }) studentId?: string | null;
  @Column({ name: 'assigned_to', type: 'uuid', nullable: true }) assignedTo?: string | null;
  @Column({ length: 180 }) subject: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'int', nullable: true }) rating?: number | null;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt?: Date | null;
}
