import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
export class ReportDateRangeDto { @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) from?: string; @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) to?: string; }
