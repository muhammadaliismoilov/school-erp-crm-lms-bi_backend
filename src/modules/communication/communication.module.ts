import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { Campaign } from './entities/campaign.entity';
import { MessageDelivery } from './entities/message-delivery.entity';
import { MessageTemplate } from './entities/message-template.entity';

@Module({ imports: [TypeOrmModule.forFeature([MessageTemplate, Campaign, MessageDelivery])], controllers: [CommunicationController], providers: [CommunicationService], exports: [CommunicationService] })
export class CommunicationModule {}
