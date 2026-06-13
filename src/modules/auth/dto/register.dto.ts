import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ali.valiyev', minLength: 3, maxLength: 80 })
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  username: string;

  @ApiProperty({ example: 'Str0ng-passphrase!', minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  password: string;

  @ApiPropertyOptional({ example: 'ali@example.com', format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsPhoneNumber('UZ')
  phone?: string;

  @ApiPropertyOptional({ example: 'Ali', minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev', minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;
}
