import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
export class ChildPortalQueryDto { @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() studentId?: string; @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) from?: string; @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) to?: string; }
