import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { HasAllLocales } from '../../../common/i18n/validators/has-all-locales.decorator';
import { Locale, supportedLocales } from '../../../common/i18n/locale';
import { NotificationChannel } from '../enums/notification-status.enum';

export class NotificationTemplateTranslationDto {
  @ApiProperty({ enum: supportedLocales, example: 'uz' })
  @IsEnum(supportedLocales)
  locale: Locale;

  @ApiPropertyOptional({ example: "To'lov eslatmasi", minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  subject?: string;

  @ApiProperty({ example: 'Hurmatli {{name}}, tolov muddati {{date}}.', minLength: 1, maxLength: 10000 })
  @IsString()
  @Length(1, 10000)
  body: string;

  @ApiPropertyOptional({ type: [String], example: ['name', 'date'], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  placeholders?: string[];
}

export class CreateNotificationTemplateDto {
  @ApiProperty({ example: 'payment-reminder', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120)
  @Matches(/^[a-z0-9_.-]+$/)
  name: string;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.SMS })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    type: [NotificationTemplateTranslationDto],
    minItems: 3,
    maxItems: 3,
    example: [
      {
        locale: 'uz',
        subject: "To'lov eslatmasi",
        body: 'Hurmatli {{name}}, tolov muddati {{date}}.',
        placeholders: ['name', 'date'],
      },
      {
        locale: 'ru',
        subject: 'Напоминание об оплате',
        body: 'Уважаемый {{name}}, срок оплаты {{date}}.',
        placeholders: ['name', 'date'],
      },
      {
        locale: 'en',
        subject: 'Payment reminder',
        body: 'Dear {{name}}, your payment is due on {{date}}.',
        placeholders: ['name', 'date'],
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @HasAllLocales()
  @ValidateNested({ each: true })
  @Type(() => NotificationTemplateTranslationDto)
  translations: NotificationTemplateTranslationDto[];
}
