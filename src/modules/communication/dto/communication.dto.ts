import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsISO8601, IsObject, IsOptional, IsString, IsUUID, Length, IsArray } from 'class-validator';
import { CampaignStatus, DeliveryStatus, MessageChannel } from '../enums/communication.enums';

export class CreateMessageTemplateDto {
  @ApiProperty() @IsString() @Length(2, 80) code: string;
  @ApiProperty() @IsString() @Length(3, 180) name: string;
  @ApiProperty({ enum: MessageChannel }) @IsEnum(MessageChannel) channel: MessageChannel;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() @Length(2, 5000) body: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) variables?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateMessageTemplateDto extends PartialType(CreateMessageTemplateDto) {}
export class CreateCampaignDto {
  @ApiProperty() @IsString() @Length(3, 180) name: string;
  @ApiProperty({ enum: MessageChannel }) @IsEnum(MessageChannel) channel: MessageChannel;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() @Length(2, 5000) body: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() targetFilter?: Record<string, unknown>;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601() scheduledAt?: string;
  @ApiPropertyOptional({ enum: CampaignStatus }) @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
}
export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}
export class CreateDeliveryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() campaignId?: string;
  @ApiProperty({ enum: MessageChannel }) @IsEnum(MessageChannel) channel: MessageChannel;
  @ApiProperty() @IsString() @Length(2, 80) recipientType: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() recipientId?: string;
  @ApiProperty() @IsString() @Length(3, 180) destination: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() @Length(1, 5000) body: string;
}
export class UpdateDeliveryDto {
  @ApiPropertyOptional({ enum: DeliveryStatus }) @IsOptional() @IsEnum(DeliveryStatus) status?: DeliveryStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() providerMessageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() errorMessage?: string;
}
