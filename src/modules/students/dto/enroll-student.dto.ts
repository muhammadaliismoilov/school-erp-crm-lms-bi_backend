import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, Length } from 'class-validator';
import { Gender } from '../enums/student-status.enum';

/**
 * Payload for the "Qabul qilish" admission form — turns a successful lead into
 * a student plus guardian + admission record. `studentCode` is generated
 * server-side; the originating `leadId` is supplied by the CRM flow.
 */
export class EnrollStudentDto {
  // --- O'quvchining shaxsiy ma'lumotlari ---
  @ApiProperty({ example: 'Valiyev', description: 'Familiyasi', maxLength: 80 })
  @IsString()
  @Length(1, 80)
  lastName: string;

  @ApiProperty({ example: 'Ali', description: 'Ism', maxLength: 80 })
  @IsString()
  @Length(1, 80)
  firstName: string;

  @ApiPropertyOptional({ example: 'Akmalovich', description: 'Otasining ismi', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  middleName?: string;

  @ApiProperty({ example: '2015-03-20', description: 'Tug‘ilgan sana', format: 'date' })
  @IsISO8601({ strict: true })
  birthDate: string;

  @ApiPropertyOptional({ enum: Gender, description: 'Jinsi' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: "o'zbek", description: 'Millati', maxLength: 60 })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  nationality?: string;

  // --- Tug'ilganlik haqida guvohnoma ---
  @ApiProperty({ example: 'AA', description: 'Guvohnoma seriyasi', maxLength: 20 })
  @IsString()
  @Length(1, 20)
  birthCertificateSeries: string;

  @ApiProperty({ example: '1234567', description: 'Guvohnoma raqami', maxLength: 40 })
  @IsString()
  @Length(1, 40)
  birthCertificateNumber: string;

  // --- Passport ma'lumotlari ---
  @ApiPropertyOptional({ example: 'AB1234567', description: 'Passport seriyasi va raqami', maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  passport?: string;

  @ApiPropertyOptional({ example: '12345678901234', description: 'JSHSHIR', maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  jshshir?: string;

  @ApiPropertyOptional({ example: '2030-01-15', description: 'Passport berilgan sanasi', format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: true })
  passportIssuedDate?: string;

  // --- Ota-ona yoki vasiy ---
  @ApiProperty({ example: 'Eshturdiyev Umidjon', description: 'Vasiy FISH', maxLength: 160 })
  @IsString()
  @Length(1, 160)
  guardianFullName: string;

  @ApiPropertyOptional({ example: 'father', description: 'Qarindoshlik darajasi', maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  guardianRelation?: string;

  @ApiPropertyOptional({ example: 'AB7654321', description: 'Vasiy passport seriyasi va raqami', maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  guardianPassport?: string;

  @ApiPropertyOptional({ example: '98765432109876', description: 'Vasiy JSHSHIR', maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  guardianJshshir?: string;

  @ApiProperty({ example: '+998909066628', description: 'Vasiy telefon raqami', maxLength: 32 })
  @IsString()
  @Length(3, 32)
  guardianPhone: string;

  // --- Yashash manzili ---
  @ApiPropertyOptional({ example: 'Toshkent', description: 'Viloyat', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  region?: string;

  @ApiPropertyOptional({ example: 'Yunusobod', description: 'Tuman', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  district?: string;

  @ApiPropertyOptional({ example: '5-mavze, 12-uy', description: "To‘liq manzil" })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string;

  // --- Bog'lanish uchun ---
  @ApiPropertyOptional({ example: '+998901112233', description: 'Shaxsiy telefon raqami', maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(3, 32)
  personalPhone?: string;
}
