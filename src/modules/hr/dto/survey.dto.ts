import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { SurveyStatus, SurveyType } from '../enums/hr.enums';

export class CreateSurveyDto {
  @ApiProperty({ example: 'Xodimlar qoniqishi' }) @IsString() @Length(1, 200) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @ApiPropertyOptional({ enum: SurveyType, default: SurveyType.ANONYMOUS })
  @IsOptional() @IsEnum(SurveyType) type?: SurveyType;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isAnonymous?: boolean;
  @ApiPropertyOptional({ example: '2026-06-02' }) @IsOptional() @IsISO8601() startDate?: string;
  @ApiPropertyOptional({ example: '2026-06-20' }) @IsOptional() @IsISO8601() endDate?: string;
}

export class UpdateSurveyDto extends PartialType(CreateSurveyDto) {}

export class SurveyQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) search?: string;
  @ApiPropertyOptional({ enum: SurveyStatus }) @IsOptional() @IsEnum(SurveyStatus) status?: SurveyStatus;
}
