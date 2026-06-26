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
import { StudentPaymentStatus } from '../entities/student-payment.entity';

export class StudentPaymentQueryDto {
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

  @ApiPropertyOptional({ description: 'O‘quvchi ismi yoki kvitansiya raqami bo‘yicha qidirish.', minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(2, 120, { message: 'Qidiruv matni 2 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;

  @ApiPropertyOptional({ description: 'Oy (1–12) bo‘yicha filter.', minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Oy butun son bo‘lishi kerak' })
  @Min(1, { message: 'Oy 1 dan kichik bo‘lmasligi kerak' })
  @Max(12, { message: 'Oy 12 dan oshmasligi kerak' })
  month?: number;

  @ApiPropertyOptional({ description: 'Yil bo‘yicha filter.', minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Yil butun son bo‘lishi kerak' })
  @Min(2000, { message: 'Yil 2000 dan kichik bo‘lmasligi kerak' })
  @Max(2100, { message: 'Yil 2100 dan oshmasligi kerak' })
  year?: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'To‘lov turi IDsi bo‘yicha filter.' })
  @IsOptional()
  @IsUUID('4', { message: 'To‘lov turi IDsi UUID bo‘lishi kerak' })
  paymentTypeId?: string;

  @ApiPropertyOptional({ description: 'To‘lov turi kodi bo‘yicha filter (cash/card/bank ...).', maxLength: 40 })
  @IsOptional()
  @IsString({ message: 'To‘lov turi kodi satr bo‘lishi kerak' })
  @Length(1, 40, { message: 'To‘lov turi kodi 1 dan 40 belgigacha bo‘lishi kerak' })
  paymentTypeCode?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Sinf IDsi bo‘yicha filter.' })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi UUID bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'O‘quvchi IDsi bo‘yicha filter.' })
  @IsOptional()
  @IsUUID('4', { message: 'O‘quvchi IDsi UUID bo‘lishi kerak' })
  studentId?: string;

  @ApiPropertyOptional({ description: 'Holat bo‘yicha filter.', enum: StudentPaymentStatus })
  @IsOptional()
  @IsEnum(StudentPaymentStatus, { message: 'Holat paid/partial/pending bo‘lishi kerak' })
  status?: StudentPaymentStatus;

  @ApiPropertyOptional({ description: 'Boshlanish sanasi (YYYY-MM-DD).', format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'Boshlanish sanasi YYYY-MM-DD formatida bo‘lishi kerak' })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Tugash sanasi (YYYY-MM-DD).', format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'Tugash sanasi YYYY-MM-DD formatida bo‘lishi kerak' })
  dateTo?: string;
}
