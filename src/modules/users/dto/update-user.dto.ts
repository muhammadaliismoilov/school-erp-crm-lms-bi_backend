import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { CreateUserDto } from './create-user.dto';

/**
 * Profil tahriri — FAQAT profil maydonlari (T-02 imtiyoz oshirish tuzatishi).
 *
 * `role`/`roleNames` va `password` ATAYLAB chiqarib tashlangan: shu paytgacha
 * `users.update` ruxsati bor har kim shu endpoint orqali o'ziga istalgan rolni
 * yozishi yoki istalgan akkaunt parolini almashtirib, u nomidan kirishi mumkin
 * edi. Endi:
 *  - rol biriktirish → `PATCH /users/:id/roles` (`roles.assign` ruxsati),
 *  - parol tiklash  → `POST /users/:id/reset-password` (`users.reset-password`).
 * Global ValidationPipe `forbidNonWhitelisted` bilan ishlaydi, shuning uchun
 * eski `{ roleNames: [...] }` yuborgan chaqiruv jim e'tiborsiz qolmaydi —
 * aniq 400 oladi (buzilish ko'rinadigan bo'ladi).
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['role', 'roleNames', 'password'] as const),
) {
  @ApiPropertyOptional({
    description: 'Foydalanuvchi statusi.',
    enum: CommonStatus,
    example: CommonStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CommonStatus, { message: 'Status ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  status?: CommonStatus;
}
