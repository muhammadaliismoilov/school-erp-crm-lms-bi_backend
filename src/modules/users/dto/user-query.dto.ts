import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { UserGender, UserManagementRole } from '../enums/user.enums';

export class UserQueryDto {
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
    description: 'Bitta sahifadagi yozuvlar soni.',
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
    description: 'Ism, familiya, login, telefon, hujjat raqami yoki JShShIR bo‘yicha qidirish.',
    example: 'Javohir',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString({ message: 'Qidiruv matni satr bo‘lishi kerak' })
  @Length(2, 120, { message: 'Qidiruv matni 2 dan 120 belgigacha bo‘lishi kerak' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Rol bo‘yicha filter.',
    enum: UserManagementRole,
    example: UserManagementRole.TEACHER,
  })
  @IsOptional()
  @IsEnum(UserManagementRole, { message: 'Rol ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  role?: UserManagementRole | string;

  @ApiPropertyOptional({
    description: 'Jinsi bo‘yicha filter.',
    enum: UserGender,
    example: UserGender.MALE,
  })
  @IsOptional()
  @IsEnum(UserGender, { message: 'Jins faqat erkak yoki ayol bo‘lishi kerak' })
  gender?: UserGender | string;

  @ApiPropertyOptional({
    description: 'Foydalanuvchi statusi bo‘yicha filter.',
    enum: CommonStatus,
    example: CommonStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CommonStatus, { message: 'Status ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  status?: CommonStatus;

  @ApiPropertyOptional({
    description:
      'Farzandi shu sinfda o‘qiydigan ota-onalarni filterlash (PARENT ro‘yxati uchun).',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi to‘g‘ri UUID bo‘lishi kerak' })
  childClassId?: string;
}
