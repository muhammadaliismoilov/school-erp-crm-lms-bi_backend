import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export enum TransactionTypeFilter {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami. 1 dan boshlanadi.', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sahifa raqami kamida 1 bo‘lishi kerak' })
  page = 1;

  @ApiPropertyOptional({
    description: 'Bitta sahifadagi yozuvlar soni (10/20/50/100).',
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

  @ApiPropertyOptional({ description: 'Izoh, shaxs ismi yoki maqsad bo‘yicha qidirish.', minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(2, 120, { message: 'Qidiruv matni 2 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;

  @ApiPropertyOptional({ description: 'Tranzaksiya turi (kirim/chiqim) bo‘yicha filter.', enum: TransactionTypeFilter })
  @IsOptional()
  @IsEnum(TransactionTypeFilter, { message: 'Tur income yoki expense bo‘lishi kerak' })
  type?: TransactionTypeFilter;

  @ApiPropertyOptional({ format: 'uuid', description: 'To‘lov turi IDsi bo‘yicha filter.' })
  @IsOptional()
  @IsUUID('4', { message: 'To‘lov turi IDsi UUID bo‘lishi kerak' })
  paymentTypeId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'To‘lov maqsadi (kategoriya) IDsi bo‘yicha filter.' })
  @IsOptional()
  @IsUUID('4', { message: 'Kategoriya IDsi UUID bo‘lishi kerak' })
  purposeCategoryId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Shaxs (foydalanuvchi) IDsi bo‘yicha filter.' })
  @IsOptional()
  @IsUUID('4', { message: 'Shaxs IDsi UUID bo‘lishi kerak' })
  personId?: string;

  @ApiPropertyOptional({ description: 'Oy (1–12) bo‘yicha filter.', minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Oy butun son bo‘lishi kerak' })
  @Min(1, { message: 'Oy 1 dan kichik bo‘lmasligi kerak' })
  @Max(12, { message: 'Oy 12 dan oshmasligi kerak' })
  month?: number;

  @ApiPropertyOptional({ description: 'Boshlanish sanasi (YYYY-MM-DD).', format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'Boshlanish sanasi YYYY-MM-DD formatida bo‘lishi kerak' })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Tugash sanasi (YYYY-MM-DD).', format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'Tugash sanasi YYYY-MM-DD formatida bo‘lishi kerak' })
  dateTo?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Sinf IDsi bo‘yicha filter (o‘quvchi to‘lovi).' })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi UUID bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'O‘quvchi IDsi bo‘yicha filter.' })
  @IsOptional()
  @IsUUID('4', { message: 'O‘quvchi IDsi UUID bo‘lishi kerak' })
  studentId?: string;
}
