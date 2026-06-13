import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'Foydalanuvchi statusi.',
    enum: CommonStatus,
    example: CommonStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CommonStatus, { message: 'Status ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  status?: CommonStatus;

  @ApiPropertyOptional({
    description: 'Parolni qayta o‘rnatish uchun yangi parol.',
    example: 'New-strong-passphrase!',
    minLength: 8,
    maxLength: 128,
  })
  @IsOptional()
  @IsString({ message: 'Parol matn bo‘lishi kerak' })
  @Length(8, 128, { message: 'Parol 8 dan 128 belgigacha bo‘lishi kerak' })
  password?: string;
}
