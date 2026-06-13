import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { NotificationChannel } from '../enums/notification-status.enum';
import { NotificationTemplateTranslation } from './notification-template-translation.entity';

@Entity('notification_templates')
@Index('uq_notification_templates_name_channel', ['name', 'channel'], { unique: true })
export class NotificationTemplate extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @OneToMany(
    () => NotificationTemplateTranslation,
    (translation) => translation.template,
    { cascade: true, eager: true },
  )
  translations: NotificationTemplateTranslation[];
}
