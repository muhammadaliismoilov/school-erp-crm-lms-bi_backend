import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { IntegrationCategory, IntegrationCode, OpenAiModel } from '../entities/integration.entity';

export class CreateIntegrationDto {
  @ApiProperty({
    description: 'Integratsiya nomi. Masalan: OpenAI yoki OnlinePBX.',
    example: 'OpenAI',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'Integratsiya nomi matn formatida bo‘lishi kerak' })
  @Length(1, 100, { message: 'Integratsiya nomi 1 dan 100 belgigacha bo‘lishi kerak' })
  name: string;

  @ApiProperty({
    description: 'Integratsiyaning noyob tizimli kodi.',
    enum: IntegrationCode,
    example: IntegrationCode.OPENAI,
  })
  @IsEnum(IntegrationCode, { message: 'Integratsiya kodi faqat openai yoki onlinepbx bo‘lishi mumkin' })
  code: IntegrationCode;

  @ApiPropertyOptional({
    description: 'Integratsiya haqida qisqacha tavsif.',
    example: 'AI yordamchi va matn generatsiya xizmati.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Tavsif matn formatida bo‘lishi kerak' })
  @Length(0, 255, { message: 'Tavsif uzunligi 255 belgidan oshmasligi kerak' })
  description?: string;

  @ApiProperty({
    description: 'Integratsiya kategoriyasi.',
    enum: IntegrationCategory,
    example: IntegrationCategory.AI_ASSISTANTS,
  })
  @IsEnum(IntegrationCategory, { message: 'Kategoriya ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  category: IntegrationCategory;

  @ApiPropertyOptional({
    description: 'Integratsiya ulangan yoki o‘chirilgan holati.',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isEnabled maydoni true yoki false bo‘lishi kerak' })
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Integratsiya konfiguratsiyasi. OpenAI uchun apiKey/model, OnlinePBX uchun domain/apiKey/webhookSecret yuboriladi.',
    examples: [
      {
        apiKey: 'sk-proj-...',
        model: OpenAiModel.GPT_4O_MINI,
        enabled: true,
      },
      {
        domain: 'u010686',
        apiKey: 'pbx-api-secret',
        webhookSecret: 'pbx-webhook-secret',
        phoneNumbers: ['+998901234567'],
        widgetScriptUrl: 'https://callback3.onlinepbx.uz/?cb-id=demo',
      },
    ],
  })
  @IsObject({ message: 'Konfiguratsiya JSON obyekt formatida bo‘lishi kerak' })
  config: Record<string, unknown>;
}
