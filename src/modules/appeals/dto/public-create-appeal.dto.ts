import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { AppealType, TargetRole } from '../entities/appeal.entity';

const normalizePhone = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value;

/**
 * Public (unauthenticated) appeal submission. A strict subset of CreateAppealDto:
 * source/status are forced server-side, so outsiders can't set them.
 */
export class PublicCreateAppealDto {
  @ApiProperty({ example: 'Ali Valiyev', minLength: 2, maxLength: 150 })
  @IsString({ message: 'Ism sharif matn formatida bo‘lishi kerak' })
  @Length(2, 150, { message: 'Ism sharif uzunligi 2 dan 150 belgigacha bo‘lishi kerak' })
  fullName: string;

  @ApiProperty({ example: '+998901234567' })
  @Transform(normalizePhone)
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam +998 bilan boshlanadigan 12 xonali O‘zbekiston raqami bo‘lishi kerak',
  })
  phone: string;

  @ApiProperty({ enum: AppealType, example: AppealType.SUGGESTION })
  @IsEnum(AppealType, { message: 'Murojaat turi faqat suggestion yoki complaint bo‘lishi mumkin' })
  type: AppealType;

  @ApiProperty({ enum: TargetRole, example: TargetRole.CLASS_TEACHER })
  @IsEnum(TargetRole, { message: 'Maqsad lavozim ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  targetRole: TargetRole;

  @ApiProperty({ example: 'Matematika xonasidagi partalarni yangilash kerak.', minLength: 5, maxLength: 5000 })
  @IsString({ message: 'Tavsif matn formatida bo‘lishi kerak' })
  @Length(5, 5000, { message: 'Tavsif uzunligi 5 dan 5000 belgigacha bo‘lishi kerak' })
  description: string;
}
