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
 *
 * `schoolId`/`branchId` ham xuddi shu sababga ko'ra ATAYLAB chiqarib
 * tashlangan: bular ilgari shu endpoint orqali yozilardi, ya'ni
 * `users.update` ruxsati bor har qanday school-scoped admin/direktor boshqa
 * maktabdagi foydalanuvchini o'z maktabiga (yoki istalgan maktabga)
 * "ko'chirib qo'yishi" mumkin edi — tenant chegarasini butunlay chetlab
 * o'tib. Endi maktab/filial ko'chirish faqat
 * `PATCH /users/:id/school` (`users.reassign-school`, faqat super-admin).
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['role', 'roleNames', 'password', 'schoolId', 'branchId'] as const),
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
