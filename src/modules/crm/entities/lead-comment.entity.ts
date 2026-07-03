import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../identity/entities/user.entity';
import { Lead } from './lead.entity';

/**
 * A note left by a staff member while working a lead. Beyond the immutable
 * audit timeline, this lets whoever touches the lead record context — e.g.
 * "call the client again tomorrow at 08:00" — optionally with a reminder.
 */
@Entity('lead_comments')
@Index('idx_lead_comments_lead', ['leadId'])
@Index('idx_lead_comments_remind_at', ['remindAt'])
export class LeadComment extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, (lead) => lead.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  /** Who wrote the note. Null once the user is removed. */
  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author?: User | null;

  @Column({ type: 'text' })
  body: string;

  /** Optional follow-up reminder ("eslatish kerak ertaga soat 8 da"). */
  @Column({ name: 'remind_at', type: 'timestamptz', nullable: true })
  remindAt?: Date | null;

  /** Set when the reminder is acknowledged; null while still pending. */
  @Column({ name: 'reminder_done_at', type: 'timestamptz', nullable: true })
  reminderDoneAt?: Date | null;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  /**
   * Extra machine-readable context for notes attached to an action,
   * e.g. a status move: `{ statusFrom: "new", statusTo: "contacted" }`.
   */
  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, unknown> | null;
}
