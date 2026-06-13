import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
@Entity('feedback_comments')
@Index(['ticketId', 'createdAt'])
export class FeedbackComment extends UuidAuditEntity {
  @Column({ name: 'ticket_id', type: 'uuid' }) ticketId: string;
  @Column({ name: 'author_id', type: 'uuid', nullable: true }) authorId?: string | null;
  @Column({ type: 'text' }) message: string;
  @Column({ name: 'is_internal', default: false }) isInternal: boolean;
}
