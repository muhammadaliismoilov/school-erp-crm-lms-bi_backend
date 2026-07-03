import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { NotificationChannelType } from '../../../common/enums/notification-enums';

/**
 * Foydalanuvchi (asosan ota-ona) uchun ro'yxatdan o'tgan xabar kanali:
 * Telegram chat_id yoki mobil push token. Bot ulanishi yoki ilova token
 * ro'yxatga olganda to'ldiriladi.
 */
@Entity('notification_channels')
@Index('uq_notification_channel_user_type', ['userId', 'type'], { unique: true })
export class NotificationChannel extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationChannelType })
  type: NotificationChannelType;

  /** Telegram chat_id yoki push token. */
  @Column({ type: 'varchar', length: 255 })
  address: string;

  /** Bir nechta kanaldan qaysi biri afzal (fallback tartibi uchun). */
  @Column({ name: 'is_preferred', type: 'boolean', default: false })
  isPreferred: boolean;

  /** Xabar tili (uz/ru/en). */
  @Column({ type: 'varchar', length: 5, default: 'uz' })
  language: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
