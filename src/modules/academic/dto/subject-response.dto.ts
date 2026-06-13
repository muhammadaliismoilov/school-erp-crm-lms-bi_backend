import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommonStatus } from '../../../common/enums/common-status.enum';

export class SubjectLocalizedNameDto {
  @ApiProperty({ example: 'Matematika' })
  uz: string;

  @ApiProperty({ example: 'Matematika' })
  ru: string;

  @ApiProperty({ example: 'Mathematics' })
  en: string;
}

export class SubjectResponseDto {
  @ApiProperty({ example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Fan nomi. UI kartalarda asosiy nom sifatida ishlatiladi.',
    example: 'Matematika',
  })
  name: string;

  @ApiProperty({
    description: 'Fanning ruscha nomi.',
    example: 'Matematika',
  })
  russianName: string;

  @ApiProperty({
    description: 'Fanning inglizcha nomi.',
    example: 'Mathematics',
  })
  englishName: string;

  @ApiProperty({ type: SubjectLocalizedNameDto })
  localizedName: SubjectLocalizedNameDto;

  @ApiProperty({
    description: 'Fan kodi. Integratsiya va import/export jarayonlarida ishlatiladi.',
    example: 'MATEMATIKA',
  })
  code: string;

  @ApiProperty({
    description: 'Fan rangi HEX formatda.',
    example: '#2563EB',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  color: string;

  @ApiProperty({ enum: CommonStatus, example: CommonStatus.ACTIVE })
  status: CommonStatus;

  @ApiProperty({ description: 'UI dagi “Faol” toggle uchun qulay boolean.', example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class SubjectResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: SubjectResponseDto })
  data: SubjectResponseDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class SubjectListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: [SubjectResponseDto] })
  data: SubjectResponseDto[];

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
