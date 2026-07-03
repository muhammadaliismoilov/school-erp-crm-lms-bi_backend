import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '../../common/constants/permissions';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CommunicationService } from './communication.service';
import { CreateCampaignDto, CreateDeliveryDto, CreateMessageTemplateDto, UpdateCampaignDto, UpdateDeliveryDto, UpdateMessageTemplateDto } from './dto/communication.dto';

@ApiTags('Communication') @ApiBearerAuth() @UseGuards(JwtAuthGuard, PermissionsGuard) @Controller({ path: 'communication', version: '1' })
export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}
  @Get('templates') @Permissions([AppPermission.COMMUNICATION_TEMPLATES_READ]) findTemplates() { return this.service.findTemplates(); }
  @Post('templates') @Permissions([AppPermission.COMMUNICATION_TEMPLATES_CREATE]) createTemplate(@Body() dto: CreateMessageTemplateDto) { return this.service.createTemplate(dto); }
  @Patch('templates/:id') @Permissions([AppPermission.COMMUNICATION_TEMPLATES_UPDATE]) updateTemplate(@Param() p: UuidParamDto, @Body() dto: UpdateMessageTemplateDto) { return this.service.updateTemplate(p.id, dto); }
  @Get('campaigns') @Permissions([AppPermission.COMMUNICATION_CAMPAIGNS_READ]) findCampaigns() { return this.service.findCampaigns(); }
  @Post('campaigns') @Permissions([AppPermission.COMMUNICATION_CAMPAIGNS_CREATE]) createCampaign(@Body() dto: CreateCampaignDto) { return this.service.createCampaign(dto); }
  @Patch('campaigns/:id') @Permissions([AppPermission.COMMUNICATION_CAMPAIGNS_UPDATE]) updateCampaign(@Param() p: UuidParamDto, @Body() dto: UpdateCampaignDto) { return this.service.updateCampaign(p.id, dto); }
  @Get('deliveries') @Permissions([AppPermission.COMMUNICATION_DELIVERIES_READ]) findDeliveries(@Query('campaignId') campaignId?: string) { return this.service.findDeliveries(campaignId); }
  @Post('deliveries') @Permissions([AppPermission.COMMUNICATION_DELIVERIES_CREATE]) createDelivery(@Body() dto: CreateDeliveryDto) { return this.service.createDelivery(dto); }
  @Patch('deliveries/:id') @Permissions([AppPermission.COMMUNICATION_DELIVERIES_UPDATE]) updateDelivery(@Param() p: UuidParamDto, @Body() dto: UpdateDeliveryDto) { return this.service.updateDelivery(p.id, dto); }
}
