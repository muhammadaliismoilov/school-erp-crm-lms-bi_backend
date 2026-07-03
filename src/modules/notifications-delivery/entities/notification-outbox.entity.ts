import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import {
  NotificationCategory,
  NotificationChannelType,
  NotificationStatus,
} from '../../../common/enums/notification-enums';

/**
 * Xabar yetkazish outbox'i — ishonchli yetkazishning yagona manbai. Har xabar
 * avval shu yerga (PENDING) yoziladi, keyin worker yuboradi va holatni
 * yangilaydi. Server o'chsa ham xabar yo'qolmaydi; `dedup_key` takrorni
 * to'sadi; `scheduled_at` tinch soatlar uchun kechiktirishni ta'minlaydi.
 */
@Entity('notification_outbox')
@Index('idx_notification_outbox_due', ['status', 'scheduledAt'])
@Index('uq_notification_outbox_dedup', ['dedupKey'], {
  unique: true,
  where: '"dedup_key" IS NOT NULL',
})
export class NotificationOutbox extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId: string;

  @Column({ type: 'enum', enum: NotificationChannelType })
  channel: NotificationChannelType;

  /** Yuborish manzili (chat_id / push token) — yaratilganda snapshot. */
  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'enum', enum: NotificationCategory })
  category: NotificationCategory;

  /** Tayyor matn (til bo'yicha rendered). */
  @Column({ type: 'text' })
  body: string;

  /** Qo'shimcha ma'lumot (studentId, sessionId, vaqt ...). */
  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt?: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  /** Takror-himoya: kategoriya+oluvchi+resurs+sana. */
  @Column({ name: 'dedup_key', type: 'varchar', length: 255, nullable: true })
  dedupKey?: string | null;
}
