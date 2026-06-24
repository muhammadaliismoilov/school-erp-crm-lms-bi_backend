import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** Uchala hisobotda umumiy pagination maydonlari. */
class PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami. 1 dan boshlanadi.', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sahifa raqami kamida 1 bo‘lishi kerak' })
  page = 1;

  @ApiPropertyOptional({ description: 'Sahifadagi o‘quvchilar soni (10/20/50/100).', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit butun son bo‘lishi kerak' })
  @Min(1, { message: 'Limit kamida 1 bo‘lishi kerak' })
  @Max(100, { message: 'Limit 100 tadan oshmasligi kerak' })
  limit = 20;
}

/** Tab 1 — O'rtacha o'zlashtirish ko'rsatkichlari. */
export class AverageReportQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Sinf IDsi.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi to‘g‘ri UUID bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ description: 'Chorak IDsi.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Chorak IDsi to‘g‘ri UUID bo‘lishi kerak' })
  quarterId?: string;
}

/** Tab 2 — Choraklik ko'rsatkichlari (fan/chorak bo'yicha matritsa). */
export class QuarterlyReportQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Sinf IDsi.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi to‘g‘ri UUID bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ description: 'Fan IDsi (berilmasa — barcha fanlar).', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Fan IDsi to‘g‘ri UUID bo‘lishi kerak' })
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Chorak IDsi (berilmasa — barcha choraklar).', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Chorak IDsi to‘g‘ri UUID bo‘lishi kerak' })
  quarterId?: string;
}

/** Tab 3 — Progress imtihon ko'rsatkichlari. */
export class ProgressExamReportQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Sinf IDsi.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi to‘g‘ri UUID bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ description: 'Fan IDsi.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Fan IDsi to‘g‘ri UUID bo‘lishi kerak' })
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Chorak IDsi.', format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Chorak IDsi to‘g‘ri UUID bo‘lishi kerak' })
  quarterId?: string;
}
