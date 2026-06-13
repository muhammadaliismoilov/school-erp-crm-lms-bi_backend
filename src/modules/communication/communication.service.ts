import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCampaignDto, CreateDeliveryDto, CreateMessageTemplateDto, UpdateCampaignDto, UpdateDeliveryDto, UpdateMessageTemplateDto } from './dto/communication.dto';
import { Campaign } from './entities/campaign.entity';
import { MessageDelivery } from './entities/message-delivery.entity';
import { MessageTemplate } from './entities/message-template.entity';

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
}
