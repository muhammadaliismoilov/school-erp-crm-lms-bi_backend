import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** O'z parolini almashtirish — eski parol majburiy (sessiya o'g'irlansa ham parol almashtirib bo'lmasin). */
export class ChangePasswordDto {
  @ApiProperty({ minLength: 8, maxLength: 128, description: 'Joriy parol.' })
  @IsString()
  @Length(8, 128)
  currentPassword: string;

  @ApiProperty({ minLength: 8, maxLength: 128, description: 'Yangi parol.' })
  @IsString()
  @Length(8, 128)
  newPassword: string;
}
