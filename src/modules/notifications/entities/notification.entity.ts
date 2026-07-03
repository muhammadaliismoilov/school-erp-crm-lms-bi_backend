import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { NotificationChannel, NotificationStatus } from '../enums/notification-status.enum';
import { NotificationTemplate } from './notification-template.entity';

@Entity('notifications')
export class Notification extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string | null;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: NotificationTemplate | null;

  @Column({ name: 'recipient_type', type: 'varchar', length: 40 })
  recipientType: string;

  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  recipientId?: string | null;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ name: 'payload_json', type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;
}
