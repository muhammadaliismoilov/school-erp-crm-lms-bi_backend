import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Login yoki registerdan qaytgan yopiq refresh token', minLength: 32, maxLength: 256 })
  @IsString()
  @Length(32, 256)
  refreshToken: string;
}
