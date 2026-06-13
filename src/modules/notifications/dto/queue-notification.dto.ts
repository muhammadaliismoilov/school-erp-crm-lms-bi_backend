import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { NotificationChannel } from '../enums/notification-status.enum';

export class QueueNotificationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ example: 'student', minLength: 2, maxLength: 40 })
  @IsString()
  @Length(2, 40)
  recipientType: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.SMS })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ example: { phone: '+998901234567', text: 'Payment reminder' } })
  @IsObject()
  payload: Record<string, unknown>;
}
