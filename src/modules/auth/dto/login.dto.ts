import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Username, email, or phone', example: 'admin' })
  @IsString()
  @Length(3, 254)
  login: string;

  @ApiProperty({ example: 'change-me-admin-password', minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  password: string;
}
