import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/**
 * Administrator tomonidan parol tiklash (`POST /users/:id/reset-password`).
 * O'z paroli uchun bu emas, eski parolni so'raydigan `/auth/change-password`
 * ishlatiladi. Bu amal barcha faol sessiyalarni bekor qiladi.
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Yangi parol.',
    example: 'New-strong-passphrase!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'Parol matn bo‘lishi kerak' })
  @Length(8, 128, { message: 'Parol 8 dan 128 belgigacha bo‘lishi kerak' })
  password: string;
}
