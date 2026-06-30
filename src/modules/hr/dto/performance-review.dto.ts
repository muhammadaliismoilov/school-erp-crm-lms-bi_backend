import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { PerformanceReviewStatus } from '../enums/hr.enums';

export class CreatePerformanceReviewDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() staffMemberId: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() reviewerId?: string;
  @ApiProperty({ example: '2026-01-01' }) @IsISO8601() periodStart: string;
  @ApiProperty({ example: '2026-06-30' }) @IsISO8601() periodEnd: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5) overallRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) strengths?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) improvements?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) goals?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) notes?: string;
  @ApiPropertyOptional({ enum: PerformanceReviewStatus })
  @IsOptional() @IsEnum(PerformanceReviewStatus) status?: PerformanceReviewStatus;
}

export class UpdatePerformanceReviewDto extends PartialType(CreatePerformanceReviewDto) {}

export class PerformanceReviewQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) search?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() staffMemberId?: string;
  @ApiPropertyOptional({ enum: PerformanceReviewStatus })
  @IsOptional() @IsEnum(PerformanceReviewStatus) status?: PerformanceReviewStatus;
}
