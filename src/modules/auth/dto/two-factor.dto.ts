import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456', description: 'Authenticator ilovasidagi 6 raqamli kod.' })
  @Matches(/^\d{6}$/, { message: 'Kod 6 ta raqamdan iborat bo\'lishi kerak' })
  code: string;
}

export class TwoFactorVerifyDto extends TwoFactorCodeDto {
  @ApiProperty({ description: 'Login javobidan olingan qisqa muddatli 2FA tokeni.' })
  @IsString()
  @Length(10, 2000)
  twoFactorToken: string;
}
