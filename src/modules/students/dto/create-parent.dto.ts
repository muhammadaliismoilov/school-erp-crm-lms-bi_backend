import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
import { UserGender } from '../../users/enums/user.enums';

export class CreateParentDto {
  @ApiProperty({ example: 'Dilshod', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  firstName: string;

  @ApiPropertyOptional({ example: 'Valiyev', minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @ApiProperty({ example: '+998901234567' })
  @IsPhoneNumber('UZ')
  phone: string;

  @ApiPropertyOptional({ example: 'parent@example.com', format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: UserGender, example: UserGender.MALE })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;
}
