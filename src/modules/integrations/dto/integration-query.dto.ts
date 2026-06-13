import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { IntegrationCategory } from '../entities/integration.entity';

const toBooleanQuery = ({ value }: { value: unknown }): unknown => {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return value;
};

export class IntegrationQueryDto {
  @ApiPropertyOptional({
    description: 'Sahifa raqami. 1 dan boshlanadi.',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sahifa raqami kamida 1 bo‘lishi kerak' })
  page = 1;

  @ApiPropertyOptional({
    description: 'Bitta sahifadagi integratsiyalar soni.',
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
    description: 'Integratsiya nomi, kodi, tavsifi yoki kategoriyasi bo‘yicha qidirish.',
    example: 'openai',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(2, 120, { message: 'Qidiruv matni 2 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;

  @ApiPropertyOptional({ description: 'Integratsiya kategoriyasi bo‘yicha filter.', enum: IntegrationCategory })
  @IsOptional()
  @IsEnum(IntegrationCategory, { message: 'Kategoriya ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  category?: IntegrationCategory;

  @ApiPropertyOptional({
    description: 'Ulangan yoki o‘chirilgan integratsiyalarni filterlash.',
    example: true,
  })
  @IsOptional()
  @Transform(toBooleanQuery)
  @IsBoolean({ message: 'Faollik holati true yoki false bo‘lishi kerak' })
  isEnabled?: boolean;
}
