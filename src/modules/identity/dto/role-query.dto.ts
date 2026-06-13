import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class RoleQueryDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami.', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sahifa raqami kamida 1 bo‘lishi kerak' })
  page = 1;

  @ApiPropertyOptional({ description: 'Bitta sahifadagi role soni.', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit butun son bo‘lishi kerak' })
  @Min(1, { message: 'Limit kamida 1 bo‘lishi kerak' })
  @Max(100, { message: 'Limit 100 tadan oshmasligi kerak' })
  limit = 20;

  @ApiPropertyOptional({ description: 'Rol nomi yoki permission kodi bo‘yicha qidirish.', example: 'teacher' })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(2, 120, { message: 'Qidiruv matni 2 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;
}
