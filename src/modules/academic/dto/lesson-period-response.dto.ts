import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LessonPeriodResponseDto {
  @ApiProperty({
    example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: '1-Dars' })
  code: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 20 })
  lessonNumber: number;

  @ApiProperty({ example: '08:00', pattern: 'HH:mm' })
  startTime: string;

  @ApiProperty({ example: '08:45', pattern: 'HH:mm' })
  endTime: string;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiPropertyOptional({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class LessonPeriodStatsDto {
  @ApiProperty({ example: 8, minimum: 0 })
  total: number;

  @ApiPropertyOptional({ example: '08:00', nullable: true, pattern: 'HH:mm' })
  firstStartTime?: string | null;
}

export class LessonPeriodListResponseDto {
  @ApiProperty({ type: [LessonPeriodResponseDto] })
  items: LessonPeriodResponseDto[];

  @ApiProperty({ type: LessonPeriodStatsDto })
  stats: LessonPeriodStatsDto;
}

export class LessonPeriodResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: LessonPeriodResponseDto })
  data: LessonPeriodResponseDto;

  @ApiProperty({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class LessonPeriodListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: [LessonPeriodResponseDto] })
  data: LessonPeriodResponseDto[];

  @ApiProperty({ example: '2026-06-07T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
