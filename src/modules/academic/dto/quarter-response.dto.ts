import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuarterStatus } from '../enums/quarter-status.enum';

export class QuarterAcademicYearBriefDto {
  @ApiProperty({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '2025/2026' })
  name: string;
}

export class QuarterResponseDto {
  @ApiProperty({ example: '5c617a45-57a4-4864-89c8-96e299173908', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid' })
  academicYearId: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 4 })
  quarterNumber: number;

  @ApiProperty({ example: '1-chorak' })
  name: string;

  @ApiProperty({ example: '2025-09-01', format: 'date' })
  startDate: string;

  @ApiProperty({ example: '2025-11-05', format: 'date' })
  endDate: string;

  @ApiProperty({
    enum: QuarterStatus,
    example: QuarterStatus.CURRENT,
    description: 'Bugungi sanaga qarab avtomatik hisoblanadi (saqlanmaydi).',
  })
  status: QuarterStatus;

  @ApiPropertyOptional({ type: QuarterAcademicYearBriefDto, nullable: true })
  academicYear?: QuarterAcademicYearBriefDto | null;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  updatedAt?: string;
}

export class QuarterStatsDto {
  @ApiProperty({ example: 4, minimum: 0 })
  total: number;

  @ApiProperty({ example: 0, minimum: 0 })
  planned: number;

  @ApiProperty({ example: 1, minimum: 0 })
  current: number;

  @ApiProperty({ example: 3, minimum: 0 })
  completed: number;
}

export class QuarterListResponseDto {
  @ApiProperty({ type: [QuarterResponseDto] })
  items: QuarterResponseDto[];

  @ApiProperty({ type: QuarterStatsDto })
  stats: QuarterStatsDto;
}
