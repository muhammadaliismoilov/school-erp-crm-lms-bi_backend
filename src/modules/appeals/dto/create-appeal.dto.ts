import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { AppealSource, AppealStatus, AppealType, TargetRole } from '../entities/appeal.entity';

const normalizePhone = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value;

export class CreateAppealDto {
  @ApiPropertyOptional({
    description:
      'Murojaat qaysi maktabga tegishli. FAQAT maktabga bog‘lanmagan hisob (bosh ofis) ' +
      'yubora oladi — maktab xodimi uchun bu o‘z maktabidan olinadi va boshqa qiymat rad etiladi.',
    example: 'f7ed51a1-63a5-4d98-9472-f4aad4f96626',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Maktab IDsi UUID formatida bo‘lishi kerak' })
  schoolId?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Anonim murojaat. `true` bo‘lsa ism va telefon SAQLANMAYDI — xodim eshitgan ' +
      'shikoyatni murojaat qiluvchini oshkor qilmasdan yozib qo‘yishi uchun.',
  })
  @IsOptional()
  @IsBoolean({ message: 'Anonim belgisi true yoki false bo‘lishi kerak' })
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    description: 'Murojaat qiluvchining to‘liq ismi sharifi. Anonim murojaatda shart emas.',
    example: 'Ali Valiyev',
    minLength: 2,
    maxLength: 150,
  })
  @ValidateIf((dto: CreateAppealDto) => !dto.isAnonymous)
  @IsString({ message: 'Ism sharif matn formatida bo‘lishi kerak' })
  @Length(2, 150, { message: 'Ism sharif uzunligi 2 dan 150 belgigacha bo‘lishi kerak' })
  fullName?: string;

  @ApiPropertyOptional({
    description:
      'O‘zbekiston telefon raqami. Format: +998901234567. Anonim murojaatda shart emas.',
    example: '+998901234567',
  })
  @ValidateIf((dto: CreateAppealDto) => !dto.isAnonymous)
  @Transform(normalizePhone)
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam +998 bilan boshlanadigan 12 xonali O‘zbekiston raqami bo‘lishi kerak',
  })
  phone?: string;

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
