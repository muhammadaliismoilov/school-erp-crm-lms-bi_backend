import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { AppealSource, AppealStatus, AppealType, TargetRole } from '../entities/appeal.entity';

export enum AppealPeriodFilter {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  WEEK = 'week',
  MONTH = 'month',
}

export class AppealQueryDto {
  @ApiPropertyOptional({
    description: 'Sahifa raqami. 1 dan boshlanadi.',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sahifa raqami kamida 1 bo‘lishi kerak' })
  page = 1;

  @ApiPropertyOptional({
    description: 'Bitta sahifadagi murojaatlar soni.',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit butun son bo‘lishi kerak' })
  @Min(1, { message: 'Limit kamida 1 bo‘lishi kerak' })
  @Max(100, { message: 'Limit 100 tadan oshmasligi kerak' })
  limit = 20;

  @ApiPropertyOptional({
    description: 'Murojaat qiluvchi ismi, telefoni yoki mazmuni bo‘yicha qidirish.',
    example: 'Ali',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(2, 120, { message: 'Qidiruv matni 2 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;

  @ApiPropertyOptional({ description: 'Murojaat turi bo‘yicha filter.', enum: AppealType })
  @IsOptional()
  @IsEnum(AppealType, { message: 'Murojaat turi ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  type?: AppealType;

  @ApiPropertyOptional({ description: 'Murojaat holati bo‘yicha filter.', enum: AppealStatus })
  @IsOptional()
  @IsEnum(AppealStatus, { message: 'Murojaat holati ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  status?: AppealStatus;

  @ApiPropertyOptional({ description: 'Maqsad lavozim bo‘yicha filter.', enum: TargetRole })
  @IsOptional()
  @IsEnum(TargetRole, { message: 'Maqsad lavozim ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  targetRole?: TargetRole;

  @ApiPropertyOptional({ description: 'Murojaat manbasi bo‘yicha filter.', enum: AppealSource })
  @IsOptional()
  @IsEnum(AppealSource, { message: 'Murojaat manbasi ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  source?: AppealSource;

  @ApiPropertyOptional({
    description: 'Sana bo‘yicha tezkor filter: bugun, kecha, shu hafta yoki shu oy.',
    enum: AppealPeriodFilter,
    example: AppealPeriodFilter.MONTH,
  })
  @IsOptional()
  @IsEnum(AppealPeriodFilter, { message: 'Davr filteri today, yesterday, week yoki month bo‘lishi kerak' })
  period?: AppealPeriodFilter;
}
