import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextInputDto } from '../../../common/i18n/dto/localized-text.dto';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Rol nomi. Masalan: Admin, Sales Manager, Teacher.',
    example: 'Sales Manager',
    minLength: 2,
    maxLength: 80,
  })
  @IsString({ message: 'Rol nomi matn bo‘lishi kerak' })
  @Length(2, 80, { message: 'Rol nomi 2 dan 80 belgigacha bo‘lishi kerak' })
  @Matches(/^[a-zA-Z0-9_.\-\s]+$/, {
    message: 'Rol nomi faqat lotin harflari, raqam, probel, nuqta, pastki chiziq va tiredan iborat bo‘lishi kerak',
  })
  name: string;

  @ApiPropertyOptional({
    description:
      'Rol ko‘rinadigan nomi lokalizatsiya bilan. Yuborilmasa name asosida yaratiladi. Faqat uz yuborilsa, ru va en avtomatik uz qiymatidan olinadi.',
    type: LocalizedTextInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextInputDto)
  title?: LocalizedTextInputDto;

  @ApiPropertyOptional({
    description: 'Rol izohi lokalizatsiya bilan. Faqat uz yuborilsa, ru va en avtomatik uz qiymatidan olinadi.',
    type: LocalizedTextInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextInputDto)
  description?: LocalizedTextInputDto;

  @ApiProperty({
    description: 'Tanlangan permission kodlari.',
    type: [String],
    example: ['students.read', 'attendance.read'],
    maxItems: 1000,
  })
  @IsArray({ message: 'Imtiyozlar massiv bo‘lishi kerak' })
  @ArrayMinSize(1, { message: 'Kamida bitta imtiyoz tanlanishi kerak' })
  @ArrayMaxSize(1000, { message: 'Imtiyozlar soni 1000 tadan oshmasligi kerak' })
  @ArrayUnique({ message: 'Imtiyoz kodlari takrorlanmasligi kerak' })
  @IsString({ each: true, message: 'Har bir imtiyoz kodi matn bo‘lishi kerak' })
  @Matches(/^[a-z0-9.*_-]+(?:\.[a-z0-9.*_-]+)*$/, {
    each: true,
    message: 'Har bir imtiyoz kodi module.action formatida bo‘lishi kerak',
  })
  permissionCodes: string[];
}
