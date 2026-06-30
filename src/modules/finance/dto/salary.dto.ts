import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** O'qituvchilar uchun dars stavkalari ro'yxati so'rovi. */
export class TeacherRateQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Akademik yil IDsi (default: joriy yil).' })
  @IsOptional()
  @IsUUID('4', { message: 'Akademik yil IDsi UUID bo‘lishi kerak' })
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Ism bo‘yicha qidiruv.' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Bitta o'qituvchining dars stavkasini belgilash/yangilash. */
export class UpsertTeacherRateDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Akademik yil IDsi (default: joriy yil).' })
  @IsOptional()
  @IsUUID('4', { message: 'Akademik yil IDsi UUID bo‘lishi kerak' })
  academicYearId?: string;

  @ApiProperty({ example: 50000, minimum: 0, description: 'Bitta dars uchun stavka (so‘m).' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Stavka son bo‘lishi kerak' })
  @Min(0, { message: 'Stavka manfiy bo‘lishi mumkin emas' })
  @Max(1_000_000_000, { message: 'Stavka juda katta' })
  ratePerLesson: number;
}

/** Oylik maoshlar ro'yxati so'rovi. */
export class SalaryQueryDto {
  @ApiProperty({ example: '2026-05', description: 'Davr, YYYY-MM formatida.' })
  @IsString()
  @Matches(PERIOD_REGEX, { message: 'Davr YYYY-MM formatida bo‘lishi kerak' })
  period: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Akademik yil IDsi (default: joriy yil).' })
  @IsOptional()
  @IsUUID('4', { message: 'Akademik yil IDsi UUID bo‘lishi kerak' })
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Ism bo‘yicha qidiruv.' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Oylik maoshlarni qayta hisoblash (yakunlangan darslarni sanab). */
export class RecalculateSalaryDto {
  @ApiProperty({ example: '2026-05', description: 'Davr, YYYY-MM formatida.' })
  @IsString()
  @Matches(PERIOD_REGEX, { message: 'Davr YYYY-MM formatida bo‘lishi kerak' })
  period: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Akademik yil IDsi (default: joriy yil).' })
  @IsOptional()
  @IsUUID('4', { message: 'Akademik yil IDsi UUID bo‘lishi kerak' })
  academicYearId?: string;
}

/** O'qituvchi maoshini qo'lda tuzatish. */
export class AdjustSalaryDto {
  @ApiPropertyOptional({ minimum: 0, description: 'Tuzatilgan dars soni.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Dars soni butun son bo‘lishi kerak' })
  @Min(0, { message: 'Dars soni manfiy bo‘lishi mumkin emas' })
  @Max(100_000)
  adjustedLessons?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Tuzatilgan summa (so‘m).' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Summa son bo‘lishi kerak' })
  @Min(0, { message: 'Summa manfiy bo‘lishi mumkin emas' })
  @Max(1_000_000_000)
  adjustedAmount?: number;

  @ApiProperty({ description: 'Tuzatish sababi.', example: 'Qo‘shimcha darslar uchun' })
  @IsString()
  @Length(1, 1000, { message: 'Tuzatish sababini yozing' })
  adjustmentReason: string;
}
