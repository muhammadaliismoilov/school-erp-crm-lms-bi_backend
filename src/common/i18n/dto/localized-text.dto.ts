import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import type { LocalizedText } from '../locale';

export class LocalizedTextDto implements LocalizedText {
  @ApiProperty({ example: 'Matematika', minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  uz: string;

  @ApiProperty({ example: 'Математика', minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  ru: string;

  @ApiProperty({ example: 'Mathematics', minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  en: string;
}

/**
 * Lokalizatsiya kiritish uchun DTO.
 * `uz` (asosiy til) majburiy, `ru` va `en` ixtiyoriy.
 * Yuborilmagan tillarni servis qatlami `uz` qiymatidan avtomatik to'ldiradi,
 * shu sababli bazada doim to'liq {uz, ru, en} saqlanadi.
 */
export class LocalizedTextInputDto implements Partial<LocalizedText> {
  @ApiProperty({ example: 'Matematika', minLength: 1, maxLength: 255 })
  @IsString({ message: 'uz matn bo‘lishi kerak' })
  @Length(1, 255, { message: 'uz uzunligi 1 dan 255 belgigacha bo‘lishi kerak' })
  uz: string;

  @ApiPropertyOptional({
    description: 'Yuborilmasa uz qiymatidan olinadi.',
    example: 'Математика',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'ru matn bo‘lishi kerak' })
  @Length(1, 255, { message: 'ru uzunligi 1 dan 255 belgigacha bo‘lishi kerak' })
  ru?: string;

  @ApiPropertyOptional({
    description: 'Yuborilmasa uz qiymatidan olinadi.',
    example: 'Mathematics',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'en matn bo‘lishi kerak' })
  @Length(1, 255, { message: 'en uzunligi 1 dan 255 belgigacha bo‘lishi kerak' })
  en?: string;
}

export class OptionalLocalizedTextDto implements Partial<LocalizedText> {
  @ApiPropertyOptional({ example: 'Matematika', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  uz?: string;

  @ApiPropertyOptional({ example: 'Математика', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  ru?: string;

  @ApiPropertyOptional({ example: 'Mathematics', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  en?: string;
}
