import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { QuarterStatus } from '../enums/quarter-status.enum';

export class CreateQuarterDto {
  @ApiProperty({
    description: 'Academic year identifier that owns this quarter',
    example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
    format: 'uuid',
  })
  @IsUUID()
  academicYearId: string;

  @ApiProperty({
    description: 'Quarter sequence number in the academic year',
    example: 1,
    minimum: 1,
    maximum: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarterNumber: number;

  @ApiProperty({ example: '2025-09-01', format: 'date' })
  @IsISO8601({ strict: true })
  startDate: string;

  @ApiProperty({ example: '2025-11-05', format: 'date' })
  @IsISO8601({ strict: true })
  endDate: string;

  @ApiPropertyOptional({
    enum: QuarterStatus,
    default: QuarterStatus.PLANNED,
    example: QuarterStatus.CURRENT,
  })
  @IsOptional()
  @IsEnum(QuarterStatus)
  status?: QuarterStatus;
}
