import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { LocalizedTextInputDto } from '../../../common/i18n/dto/localized-text.dto';

export class UpsertSchoolDto {
  @ApiProperty({
    description: 'Maktab nomi lokalizatsiya bilan. Faqat uz yuborilsa, ru va en avtomatik uz qiymatidan olinadi.',
    type: LocalizedTextInputDto,
  })
  @ValidateNested()
  @Type(() => LocalizedTextInputDto)
  name: LocalizedTextInputDto;

  @ApiPropertyOptional({ example: 'Tashkent, Uzbekistan', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  address?: string;

  @ApiPropertyOptional({ example: 'info@yuton.uz', format: 'email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+998901234567', minLength: 1, maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'UZS', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 'Asia/Tashkent', minLength: 1, maxLength: 64 })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'uz', minLength: 2, maxLength: 12 })
  @IsOptional()
  @IsString()
  @Length(2, 12)
  language?: string;
}
