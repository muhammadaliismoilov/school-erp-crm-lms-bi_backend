import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCampaignDto, CreateDeliveryDto, CreateMessageTemplateDto, UpdateCampaignDto, UpdateDeliveryDto, UpdateMessageTemplateDto } from './dto/communication.dto';
import { CampaignStatus, DeliveryStatus, MessageChannel } from './enums/communication.enums';
import { Campaign } from './entities/campaign.entity';
import { MessageDelivery } from './entities/message-delivery.entity';
import { MessageTemplate } from './entities/message-template.entity';

/** One resolved SMS recipient — a student and the phone number to deliver to. */
export interface ClassCampaignRecipient {
  studentId: string;
  phone: string;
}

export interface ClassCampaignInput {
  name: string;
  body: string;
  templateId?: string | null;
  scheduledAt?: Date | null;
  targetFilter?: Record<string, unknown>;
  recipients: ClassCampaignRecipient[];
}

export interface ClassCampaignResult {
  campaignId: string;
  totalRecipients: number;
  status: CampaignStatus;
  scheduledAt: Date | null;
}

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(MessageTemplate) private readonly templates: Repository<MessageTemplate>,
    @InjectRepository(Campaign) private readonly campaigns: Repository<Campaign>,
    @InjectRepository(MessageDelivery) private readonly deliveries: Repository<MessageDelivery>,
  ) {}
  findTemplates() { return this.templates.find({ order: { createdAt: 'DESC' } }); }
  createTemplate(dto: CreateMessageTemplateDto) { return this.templates.save(this.templates.create(dto)); }
  async updateTemplate(id: string, dto: UpdateMessageTemplateDto) { const entity = await this.templates.preload({ id, ...dto }); if (!entity) throw new NotFoundException('Message template not found'); return this.templates.save(entity); }
  findCampaigns() { return this.campaigns.find({ order: { createdAt: 'DESC' } }); }
  createCampaign(dto: CreateCampaignDto) { return this.campaigns.save(this.campaigns.create({ ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined })); }
  async updateCampaign(id: string, dto: UpdateCampaignDto) { const entity = await this.campaigns.preload({ id, ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined }); if (!entity) throw new NotFoundException('Campaign not found'); return this.campaigns.save(entity); }
  findDeliveries(campaignId?: string) { return this.deliveries.find({ where: campaignId ? { campaignId } : {}, order: { createdAt: 'DESC' } }); }
  createDelivery(dto: CreateDeliveryDto) { return this.deliveries.save(this.deliveries.create(dto)); }
  async updateDelivery(id: string, dto: UpdateDeliveryDto) { const entity = await this.deliveries.preload({ id, ...dto }); if (!entity) throw new NotFoundException('Message delivery not found'); return this.deliveries.save(entity); }

  /** Fetch a single template by id, used when a campaign references a saved SMS template. */
  async findTemplateById(id: string): Promise<MessageTemplate> {
    const template = await this.templates.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Message template not found');
    return template;
  }

  /**
   * Create an SMS campaign for a school class and fan it out into per-student
   * deliveries. Used by the academic module's "send SMS to class" feature.
   * A future date schedules the campaign; otherwise it runs immediately.
   * No real SMS provider is wired in — deliveries are queued for a worker.
   */
  async createClassCampaign(input: ClassCampaignInput): Promise<ClassCampaignResult> {
    const scheduledAt = input.scheduledAt ?? null;
    const status = scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING;

    const campaign = await this.campaigns.save(
      this.campaigns.create({
        name: input.name,
        channel: MessageChannel.SMS,
        templateId: input.templateId ?? null,
        body: input.body,
        targetFilter: input.targetFilter ?? {},
        scheduledAt,
        status,
      }),
    );

    if (input.recipients.length > 0) {
      await this.deliveries.save(
        input.recipients.map((recipient) =>
          this.deliveries.create({
            campaignId: campaign.id,
            channel: MessageChannel.SMS,
            recipientType: 'student',
            recipientId: recipient.studentId,
            destination: recipient.phone,
            body: input.body,
            status: DeliveryStatus.QUEUED,
          }),
        ),
      );
    }

    return { campaignId: campaign.id, totalRecipients: input.recipients.length, status, scheduledAt };
  }
}
