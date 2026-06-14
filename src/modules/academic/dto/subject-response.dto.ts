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

export class SubjectListStatsDto {
  @ApiProperty({ example: 8 })
  total: number;

  @ApiProperty({ example: 8 })
  active: number;

  @ApiProperty({ example: 0 })
  inactive: number;
}

export class SubjectListResultDto {
  @ApiProperty({ type: [SubjectResponseDto] })
  items: SubjectResponseDto[];

  @ApiProperty({ type: SubjectListStatsDto })
  stats: SubjectListStatsDto;
}

export class SubjectClassBriefDto {
  @ApiProperty({ example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '1-A' })
  name: string;
}

export class SubjectTeacherBriefDto {
  @ApiProperty({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Dilnoza Mirzayeva' })
  fullName: string;
}

export class SubjectOverviewStatsDto {
  @ApiProperty({ example: 10 })
  classCount: number;

  @ApiProperty({ example: 10 })
  teacherCount: number;

  @ApiProperty({ example: 120 })
  lessonCount: number;

  @ApiProperty({ example: 3.9, minimum: 0, maximum: 5 })
  averageMastery: number;
}

export class SubjectOverviewResponseDto {
  @ApiProperty({ type: SubjectResponseDto })
  subject: SubjectResponseDto;

  @ApiProperty({ type: SubjectOverviewStatsDto })
  stats: SubjectOverviewStatsDto;

  @ApiProperty({ type: [SubjectClassBriefDto] })
  classes: SubjectClassBriefDto[];

  @ApiProperty({ type: [SubjectTeacherBriefDto] })
  teachers: SubjectTeacherBriefDto[];
}

export class SubjectScheduleLessonDto {
  @ApiProperty({ example: 'a1f35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '2026-06-24', format: 'date' })
  lessonDate: string;

  @ApiProperty({ example: 1, description: '1=Dushanba … 7=Yakshanba', minimum: 1, maximum: 7 })
  weekday: number;

  @ApiProperty({ type: SubjectClassBriefDto })
  class: SubjectClassBriefDto;

  @ApiPropertyOptional({ example: 'Aziz Toshmatov', nullable: true })
  teacherName?: string | null;

  @ApiPropertyOptional({ example: '1-dars', nullable: true })
  periodLabel?: string | null;

  @ApiPropertyOptional({ example: '08:30', nullable: true })
  startTime?: string | null;

  @ApiPropertyOptional({ example: '09:15', nullable: true })
  endTime?: string | null;

  @ApiPropertyOptional({ example: 'planned' })
  status?: string;
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

  @ApiProperty({ type: SubjectListResultDto })
  data: SubjectListResultDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class SubjectOverviewResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: SubjectOverviewResponseDto })
  data: SubjectOverviewResponseDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class SubjectScheduleResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: [SubjectScheduleLessonDto] })
  data: SubjectScheduleLessonDto[];

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
