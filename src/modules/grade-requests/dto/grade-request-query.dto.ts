import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { GradeRequestKind, GradeRequestStatus } from '../entities/grade-change-request.entity';

export class GradeRequestQueryDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami. 1 dan boshlanadi.', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sahifa raqami kamida 1 bo‘lishi kerak' })
  page = 1;

  @ApiPropertyOptional({
    description: 'Bitta sahifadagi so‘rovlar soni.',
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
    description: 'O‘quvchi ismi, fan nomi yoki sabab bo‘yicha qidirish.',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(2, 120, { message: 'Qidiruv matni 2 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;

  @ApiPropertyOptional({ description: 'Baho turi bo‘yicha filter (tab).', enum: GradeRequestKind })
  @IsOptional()
  @IsEnum(GradeRequestKind, { message: 'Baho turi ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  kind?: GradeRequestKind;

  @ApiPropertyOptional({ description: 'Holat bo‘yicha filter.', enum: GradeRequestStatus })
  @IsOptional()
  @IsEnum(GradeRequestStatus, { message: 'Holat ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  status?: GradeRequestStatus;
}
