import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNotificationTemplateDto } from './dto/create-template.dto';
import { QueueNotificationDto } from './dto/queue-notification.dto';
import { NotificationTemplateTranslation } from './entities/notification-template-translation.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templates: Repository<NotificationTemplate>,
    @InjectRepository(NotificationTemplateTranslation)
    private readonly templateTranslations: Repository<NotificationTemplateTranslation>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  createTemplate(dto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = this.templates.create({
      name: dto.name,
      channel: dto.channel,
      translations: dto.translations.map((translation) =>
        this.templateTranslations.create(translation),
      ),
    });

    return this.templates.save(template);
  }

  findTemplates(): Promise<NotificationTemplate[]> {
    return this.templates.find({
      relations: { translations: true },
      order: { name: 'ASC' },
    });
  }

  queueNotification(dto: QueueNotificationDto): Promise<Notification> {
    return this.notifications.save(this.notifications.create(dto));
  }
}
