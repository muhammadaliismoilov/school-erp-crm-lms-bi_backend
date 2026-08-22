import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { ClassLanguage } from './create-class.dto';

const normalizeSearch = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ClassQueryDto {
  @ApiPropertyOptional({
    description: "O'quv yili bo'yicha filtrlash.",
    example: '5c617a45-57a4-4864-89c8-96e299173908',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ description: 'Sinf darajasi bo‘yicha filtrlash.', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel?: number;

  @ApiPropertyOptional({ description: 'Taʼlim tili bo‘yicha filtrlash.', enum: ClassLanguage })
  @IsOptional()
  @IsEnum(ClassLanguage)
  language?: ClassLanguage;

  @ApiPropertyOptional({
    description: 'Xona IDsi bo‘yicha filtrlash.',
    example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({
    description: 'Kurator IDsi bo‘yicha filtrlash.',
    example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  curatorId?: string;

  @ApiPropertyOptional({
    description: 'Sinf nomi bo‘yicha qidirish. Masalan: 1-A yoki A.',
    example: '1-A',
    minLength: 1,
    maxLength: 80,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeSearch(value))
  @IsString()
  @Length(1, 80)
  @Matches(/^[A-Za-z0-9\- ]+$/)
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 200,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 100;
}
