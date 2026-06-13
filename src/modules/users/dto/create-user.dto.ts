import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { UserGender, UserManagementRole } from '../enums/user.enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

const normalizePhone = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value;

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'Login. Yuborilmasa backend role asosida noyob login yaratadi.',
    example: 'javohir.aliyev',
    minLength: 3,
    maxLength: 80,
  })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Login matn bo‘lishi kerak' })
  @Length(3, 80, { message: 'Login 3 dan 80 belgigacha bo‘lishi kerak' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Login faqat lotin harflari, raqam, nuqta, pastki chiziq va tirelardan iborat bo‘lishi kerak',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Parol. Yuborilmasa vaqtinchalik xavfsiz parol yaratiladi.',
    example: 'Str0ng-passphrase!',
    minLength: 8,
    maxLength: 128,
  })
  @IsOptional()
  @IsString({ message: 'Parol matn bo‘lishi kerak' })
  @Length(8, 128, { message: 'Parol 8 dan 128 belgigacha bo‘lishi kerak' })
  password?: string;

  @ApiPropertyOptional({ description: 'Email manzil.', example: 'javohir@example.uz', format: 'email' })
  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: 'Email formati noto‘g‘ri' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Profil rasmi URL manzili.',
    example: 'https://cdn.example.uz/users/javohir.png',
  })
  @IsOptional()
  @Transform(trim)
  @IsUrl({ require_protocol: true }, { message: 'Profil rasmi URL manzili to‘g‘ri bo‘lishi kerak' })
  @Length(8, 500, { message: 'Profil rasmi URL manzili 8 dan 500 belgigacha bo‘lishi kerak' })
  profileImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Profil rasmi fayl IDsi.',
    example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Profil rasmi fayl IDsi UUID formatida bo‘lishi kerak' })
  profileImageFileId?: string;

  @ApiProperty({ description: 'Ism lotin yozuvida.', example: 'Javohir', minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsString({ message: 'Ism matn bo‘lishi kerak' })
  @Length(1, 80, { message: 'Ism 1 dan 80 belgigacha bo‘lishi kerak' })
  firstName: string;

  @ApiProperty({ description: 'Ism kirill yozuvida.', example: 'Жавоҳир', minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsString({ message: 'Ism kirillchada matn bo‘lishi kerak' })
  @Length(1, 80, { message: 'Ism kirillchada 1 dan 80 belgigacha bo‘lishi kerak' })
  @Matches(/^[\p{Script=Cyrillic}\s'’‘-]+$/u, {
    message: 'Ism kirillchada kirill harflari bilan yozilishi kerak',
  })
  firstNameCyrillic: string;

  @ApiProperty({ description: 'Familiya lotin yozuvida.', example: 'Aliyev', minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsString({ message: 'Familiya matn bo‘lishi kerak' })
  @Length(1, 80, { message: 'Familiya 1 dan 80 belgigacha bo‘lishi kerak' })
  lastName: string;

  @ApiProperty({ description: 'Familiya kirill yozuvida.', example: 'Алиев', minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsString({ message: 'Familiya kirillchada matn bo‘lishi kerak' })
  @Length(1, 80, { message: 'Familiya kirillchada 1 dan 80 belgigacha bo‘lishi kerak' })
  @Matches(/^[\p{Script=Cyrillic}\s'’‘-]+$/u, {
    message: 'Familiya kirillchada kirill harflari bilan yozilishi kerak',
  })
  lastNameCyrillic: string;

  @ApiPropertyOptional({
    description: 'Otasining ismi lotin yozuvida.',
    example: 'Valiyevich',
    minLength: 1,
    maxLength: 80,
  })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Otasining ismi matn bo‘lishi kerak' })
  @Length(1, 80, { message: 'Otasining ismi 1 dan 80 belgigacha bo‘lishi kerak' })
  middleName?: string;

  @ApiPropertyOptional({
    description: 'Otasining ismi kirill yozuvida.',
    example: 'Валиевич',
    minLength: 1,
    maxLength: 80,
  })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Otasining ismi kirillchada matn bo‘lishi kerak' })
  @Length(1, 80, { message: 'Otasining ismi kirillchada 1 dan 80 belgigacha bo‘lishi kerak' })
  @Matches(/^[\p{Script=Cyrillic}\s'’‘-]+$/u, {
    message: 'Otasining ismi kirillchada kirill harflari bilan yozilishi kerak',
  })
  middleNameCyrillic?: string;

  @ApiPropertyOptional({ description: 'Tug‘ilgan sana ISO formatida.', example: '2000-01-15', format: 'date' })
  @IsOptional()
  @IsDateString({}, { message: 'Tug‘ilgan sana ISO formatida bo‘lishi kerak' })
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Pasport/ID hujjat raqami.', example: 'AB1234567', maxLength: 32 })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Hujjat raqami matn bo‘lishi kerak' })
  @Length(2, 32, { message: 'Hujjat raqami 2 dan 32 belgigacha bo‘lishi kerak' })
  @Matches(/^[A-Z0-9-]+$/i, {
    message: 'Hujjat raqami faqat lotin harflari, raqam va tiredan iborat bo‘lishi kerak',
  })
  documentNumber?: string;

  @ApiProperty({ description: 'Jinsi.', enum: UserGender, example: UserGender.MALE })
  @IsEnum(UserGender, { message: 'Jins faqat erkak yoki ayol bo‘lishi kerak' })
  gender: UserGender | string;

  @ApiPropertyOptional({ description: 'O‘zbekiston telefon raqami.', example: '+998901234567' })
  @IsOptional()
  @Transform(normalizePhone)
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqami +998XXXXXXXXX formatida bo‘lishi kerak',
  })
  phone?: string;

  @ApiProperty({
    description: 'Foydalanuvchi roli.',
    enum: UserManagementRole,
    example: UserManagementRole.TEACHER,
  })
  @ValidateIf((dto: CreateUserDto) => !dto.roleNames || dto.roleNames.length === 0)
  @IsEnum(UserManagementRole, { message: 'Rol ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  role?: UserManagementRole | string;

  @ApiPropertyOptional({
    description: 'Legacy yoki integratsiya uchun role nomlari. Yangi formalar role maydonidan foydalansin.',
    type: [String],
    example: ['teacher'],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray({ message: 'Role nomlari massiv bo‘lishi kerak' })
  @ArrayMaxSize(10, { message: 'Role nomlari 10 tadan oshmasligi kerak' })
  @IsString({ each: true, message: 'Har bir role nomi matn bo‘lishi kerak' })
  roleNames?: string[];

  @ApiPropertyOptional({ description: 'JShShIR / PINFL. 14 xonali raqam.', example: '12345678901234' })
  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'JShShIR 14 xonali raqam bo‘lishi kerak' })
  pinfl?: string;
}
