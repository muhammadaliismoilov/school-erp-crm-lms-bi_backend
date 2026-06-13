import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Locale } from '../../../common/i18n/locale';
import { NotificationTemplate } from './notification-template.entity';

@Entity('notification_template_translations')
@Index('uq_notification_template_translations_locale', ['templateId', 'locale'], {
  unique: true,
})
export class NotificationTemplateTranslation extends UuidAuditEntity {
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => NotificationTemplate, (template) => template.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: NotificationTemplate;

  @Column({ type: 'varchar', length: 2 })
  locale: Locale;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject?: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'placeholders_json', type: 'jsonb', nullable: true })
  placeholders?: string[] | null;
}
