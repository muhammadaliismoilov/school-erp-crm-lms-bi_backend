import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationCategory, IntegrationCode, OpenAiModel } from '../entities/integration.entity';

export class IntegrationResponseSchema {
  @ApiProperty({ example: '0f8fad5b-d9cb-469f-a165-70867728950e', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'OpenAI', description: 'Integratsiya nomi.' })
  name: string;

  @ApiProperty({ enum: IntegrationCode, example: IntegrationCode.OPENAI, description: 'Integratsiya tizimli kodi.' })
  code: IntegrationCode | string;

  @ApiPropertyOptional({ example: 'AI yordamchi va matn generatsiya xizmati.', nullable: true })
  description?: string | null;

  @ApiProperty({ enum: IntegrationCategory, example: IntegrationCategory.AI_ASSISTANTS, description: 'Integratsiya kategoriyasi.' })
  category: IntegrationCategory | string;

  @ApiProperty({ example: true, description: 'Integratsiya ulanganligi.' })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Xavfsizlik uchun secret maydonlari maskalangan konfiguratsiya.',
    example: { apiKey: 'sk-proj...1234', model: OpenAiModel.GPT_4O_MINI, enabled: true },
  })
  config: Record<string, unknown>;

  @ApiProperty({ example: '2026-06-09T11:00:00.000Z', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-09T11:00:00.000Z', format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null, format: 'date-time', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty({ example: 1 })
  version: number;
}

export class IntegrationPageMetaSchema {
  @ApiProperty({ example: 1, description: 'Joriy sahifa raqami.' })
  page: number;

  @ApiProperty({ example: 20, description: 'Har bir sahifadagi elementlar soni.' })
  limit: number;

  @ApiProperty({ example: 2, description: 'Umumiy integratsiyalar soni.' })
  total: number;

  @ApiProperty({ example: 1, description: 'Jami sahifalar soni.' })
  pageCount: number;
}

export class IntegrationStatsSchema {
  @ApiProperty({ example: 2, description: 'Barcha integratsiyalar soni.' })
  totalCount: number;

  @ApiProperty({ example: 2, description: 'Ulangan integratsiyalar soni.' })
  connectedCount: number;
}

export class IntegrationListResponseSchema {
  @ApiProperty({ type: [IntegrationResponseSchema] })
  items: IntegrationResponseSchema[];

  @ApiProperty({ type: IntegrationPageMetaSchema })
  meta: IntegrationPageMetaSchema;

  @ApiProperty({ type: IntegrationStatsSchema })
  stats: IntegrationStatsSchema;
}
