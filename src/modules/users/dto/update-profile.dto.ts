import { PartialType, PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * Foydalanuvchi o‘z profilini tahrirlash uchun DTO ("Mening profilim" formasi).
 * Login, parol, rol, status va PINFL kabi xavfsizlik maydonlarini ataylab o‘z ichiga olmaydi —
 * ularni faqat administrator UsersController orqali o‘zgartira oladi.
 */
export class UpdateProfileDto extends PartialType(
  PickType(CreateUserDto, [
    'firstName',
    'firstNameCyrillic',
    'lastName',
    'lastNameCyrillic',
    'middleName',
    'middleNameCyrillic',
    'birthDate',
    'documentNumber',
    'gender',
    'phone',
    'email',
    'profileImageUrl',
    'profileImageFileId',
  ] as const),
) {}
