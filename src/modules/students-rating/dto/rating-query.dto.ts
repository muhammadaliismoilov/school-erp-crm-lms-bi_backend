import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

/**
 * O'quvchilar reytingi ro'yxati uchun filtr + pagination so'rovi.
 * Barcha maydonlar ixtiyoriy — bo'sh so'rov barcha aktiv o'quvchilarni qaytaradi.
 */
export class RatingQueryDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami. 1 dan boshlanadi.', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sahifa raqami kamida 1 bo‘lishi kerak' })
  page = 1;

  @ApiPropertyOptional({
    description: 'Bitta sahifadagi o‘quvchilar soni (10/20/50/100).',
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

  @ApiPropertyOptional({ description: 'O‘quvchi ismi yoki familiyasi bo‘yicha qidirish.', minLength: 1, maxLength: 120 })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(1, 120, { message: 'Qidiruv matni 1 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;

  @ApiPropertyOptional({ description: 'O‘quv yili IDsi. Berilmasa joriy yil olinadi.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'O‘quv yili IDsi to‘g‘ri UUID bo‘lishi kerak' })
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Sinf darajasi (masalan 1 = 1-sinf).', minimum: 1, maximum: 11 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sinf darajasi butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sinf darajasi kamida 1 bo‘lishi kerak' })
  @Max(11, { message: 'Sinf darajasi 11 dan oshmasligi kerak' })
  gradeLevel?: number;

  @ApiPropertyOptional({ description: 'Aniq sinf IDsi (masalan 1A).', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi to‘g‘ri UUID bo‘lishi kerak' })
  classId?: string;
}
