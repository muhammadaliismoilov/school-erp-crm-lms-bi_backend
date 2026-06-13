import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { AppealSource, AppealStatus, AppealType, TargetRole } from '../entities/appeal.entity';

const normalizePhone = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value;

export class CreateAppealDto {
  @ApiProperty({
    description: 'Murojaat qiluvchining to‘liq ismi sharifi.',
    example: 'Ali Valiyev',
    minLength: 2,
    maxLength: 150,
  })
  @IsString({ message: 'Ism sharif matn formatida bo‘lishi kerak' })
  @Length(2, 150, { message: 'Ism sharif uzunligi 2 dan 150 belgigacha bo‘lishi kerak' })
  fullName: string;

  @ApiProperty({
    description: 'O‘zbekiston telefon raqami. Format: +998901234567.',
    example: '+998901234567',
  })
  @Transform(normalizePhone)
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam +998 bilan boshlanadigan 12 xonali O‘zbekiston raqami bo‘lishi kerak',
  })
  phone: string;

  @ApiProperty({
    description: 'Murojaat turi: taklif yoki shikoyat.',
    enum: AppealType,
    example: AppealType.SUGGESTION,
  })
  @IsEnum(AppealType, { message: 'Murojaat turi faqat suggestion yoki complaint bo‘lishi mumkin' })
  type: AppealType;

  @ApiProperty({
    description: 'Murojaat yo‘naltirilgan lavozim.',
    enum: TargetRole,
    example: TargetRole.CLASS_TEACHER,
  })
  @IsEnum(TargetRole, { message: 'Maqsad lavozim ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  targetRole: TargetRole;

  @ApiProperty({
    description: 'Murojaatning batafsil mazmuni.',
    example: 'Matematika xonasidagi partalarni yangilash kerak.',
    minLength: 5,
    maxLength: 5000,
  })
  @IsString({ message: 'Tavsif matn formatida bo‘lishi kerak' })
  @Length(5, 5000, { message: 'Tavsif uzunligi 5 dan 5000 belgigacha bo‘lishi kerak' })
  description: string;

  @ApiPropertyOptional({
    description: 'Murojaat kelib tushgan manba.',
    enum: AppealSource,
    default: AppealSource.PUBLIC_LINK,
    example: AppealSource.PUBLIC_LINK,
  })
  @IsOptional()
  @IsEnum(AppealSource, { message: 'Manba faqat manual, public_link yoki system bo‘lishi mumkin' })
  source?: AppealSource;

  @ApiPropertyOptional({
    description: 'Murojaatning joriy holati.',
    enum: AppealStatus,
    default: AppealStatus.PENDING,
    example: AppealStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AppealStatus, { message: 'Murojaat holati ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  status?: AppealStatus;
}
