import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { CommonStatus } from '../../../common/enums/common-status.enum';

const trimText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CourseQueryDto {
  @ApiPropertyOptional({ description: 'Kurs nomi bo‘yicha qidiruv.', example: 'IT', maxLength: 160 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 160)
  search?: string;

  @ApiPropertyOptional({ description: 'Chorak IDsi bo‘yicha filter.', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  quarterId?: string;

  @ApiPropertyOptional({ description: 'Chorak raqami bo‘yicha filter.', example: 4, minimum: 1, maximum: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarterNumber?: number;

  @ApiPropertyOptional({ description: 'Boshlanish sanasi filteri.', example: '2026-03-26', format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({ description: 'Tugash sanasi filteri.', example: '2026-06-15', format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiPropertyOptional({ description: 'Fan IDsi bo‘yicha filter.', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'O‘qituvchi IDsi bo‘yicha filter.', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Kurs holati bo‘yicha filter.', enum: CommonStatus })
  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;

  @ApiPropertyOptional({ description: 'Sahifa raqami.', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Bitta sahifadagi kurslar soni.', example: 12, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AvailableCourseStudentsQueryDto {
  @ApiPropertyOptional({ description: 'Sinf IDsi bo‘yicha o‘quvchilarni filterlash.', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'O‘quvchi FISH yoki kodi bo‘yicha qidiruv.', example: 'Aziz', maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 120)
  search?: string;
}
