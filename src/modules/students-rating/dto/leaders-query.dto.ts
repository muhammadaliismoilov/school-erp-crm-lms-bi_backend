import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/**
 * Liderlar tab (podium + top ro'yxat) uchun so'rov.
 * Limit faqat 10 yoki 20 — UI'dagi "Top 10 / Top 20" tugmalariga mos.
 */
export class LeadersQueryDto {
  @ApiPropertyOptional({ description: 'Top o‘quvchilar soni: 10 yoki 20.', enum: [10, 20], default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit butun son bo‘lishi kerak' })
  @IsIn([10, 20], { message: 'Limit faqat 10 yoki 20 bo‘lishi mumkin' })
  limit = 10;

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
