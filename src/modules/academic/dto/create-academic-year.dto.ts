import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional, IsString, Length } from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({ example: '2026-2027', minLength: 4, maxLength: 40 })
  @IsString()
  @Length(4, 40)
  name: string;

  @ApiProperty({ example: '2026-09-01', format: 'date' })
  @IsISO8601({ strict: true })
  startDate: string;

  @ApiProperty({ example: '2027-05-31', format: 'date' })
  @IsISO8601({ strict: true })
  endDate: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
