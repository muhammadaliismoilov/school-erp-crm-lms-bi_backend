import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { NotificationChannelType } from '../../../common/enums/notification-enums';

export class RegisterChannelDto {
  @ApiProperty({ enum: NotificationChannelType })
  @IsEnum(NotificationChannelType)
  type: NotificationChannelType;

  @ApiProperty({ description: 'Telegram chat_id yoki push token.', maxLength: 255 })
  @IsString()
  @Length(1, 255)
  address: string;

  @ApiPropertyOptional({ enum: ['uz', 'ru', 'en'], default: 'uz' })
  @IsOptional()
  @IsIn(['uz', 'ru', 'en'])
  language?: string;

  @ApiPropertyOptional({ description: 'Ushbu kanalni afzal qilish.' })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}
