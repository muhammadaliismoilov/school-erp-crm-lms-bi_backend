import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { CommunicationSentiment } from '../entities/parent-communication.entity';

export class ParentCommQueryDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami. 1 dan boshlanadi.', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1, { message: 'Sahifa raqami kamida 1 bo‘lishi kerak' })
  page = 1;

  @ApiPropertyOptional({ description: 'Bitta sahifadagi muloqotlar soni.', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit butun son bo‘lishi kerak' })
  @Min(1, { message: 'Limit kamida 1 bo‘lishi kerak' })
  @Max(100, { message: 'Limit 100 tadan oshmasligi kerak' })
  limit = 20;

  @ApiPropertyOptional({ description: 'Munosabat (sentiment) bo‘yicha filter.', enum: CommunicationSentiment })
  @IsOptional()
  @IsEnum(CommunicationSentiment, { message: 'Munosabat ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  sentiment?: CommunicationSentiment;

  @ApiPropertyOptional({ format: 'uuid', description: 'Sinf bo‘yicha filter.' })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi UUID formatida bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ description: 'Yil bo‘yicha filter.', minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Yil butun son bo‘lishi kerak' })
  @Min(2000, { message: 'Yil 2000 dan kichik bo‘lmasligi kerak' })
  @Max(2100, { message: 'Yil 2100 dan oshmasligi kerak' })
  year?: number;

  @ApiPropertyOptional({ description: 'Oy bo‘yicha filter (1–12).', minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Oy butun son bo‘lishi kerak' })
  @Min(1, { message: 'Oy kamida 1 bo‘lishi kerak' })
  @Max(12, { message: 'Oy 12 dan oshmasligi kerak' })
  month?: number;

  @ApiPropertyOptional({ description: 'Qidiruv (ota-ona/maqsad/izoh).', minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(2, 120, { message: 'Qidiruv matni 2 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;
}
