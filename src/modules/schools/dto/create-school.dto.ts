import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { GroupMonthlyPaymentDto } from './group-monthly-payment.dto';
import { PaymentPeriodUnit, PaymentStartStrategy, SchoolType, WorkDays } from '../enums/school.enums';
import { SCHOOL_WEBSITE_URL_MESSAGE, SCHOOL_WEBSITE_URL_PATTERN } from '../website-url.constants';

const trimText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class CreateSchoolDto {
  @ApiProperty({ description: 'Maktab nomi.', example: 'Toshkent Intellekt Maktabi', minLength: 1, maxLength: 160 })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 160)
  name: string;

  @ApiPropertyOptional({ description: 'Maktabning yuridik nomi.', example: 'Toshkent Intellekt Xususiy Maktabi MCHJ', maxLength: 255 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 255)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Davlat (ISO 3166-1 alpha-2 kodi).', example: 'UZ', minLength: 2, maxLength: 2, default: 'UZ' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ description: 'Viloyat yoki hudud nomi.', example: 'Toshkent shahri', maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 120)
  region?: string;

  @ApiPropertyOptional({ description: 'Tuman nomi.', example: 'Yunusobod tumani', maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 120)
  district?: string;

  @ApiPropertyOptional({ description: 'Maktab manzili.', example: 'Yunusobod tumani, 4-mavze, 15-uy', maxLength: 255 })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @Length(1, 255)
  address?: string;

  @ApiPropertyOptional({
    description:
      "Maktab veb-sayt manzili — subdomain-tenant login manbai (masalan https://elegantschool.crm.uz).",
    example: 'https://elegantschool.crm.uz',
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsUrl({ require_protocol: true })
  @Matches(SCHOOL_WEBSITE_URL_PATTERN, { message: SCHOOL_WEBSITE_URL_MESSAGE })
  websiteUrl?: string;

  @ApiProperty({ description: 'Maktab turi.', enum: SchoolType, example: SchoolType.PRIVATE })
  @IsEnum(SchoolType)
  schoolType: SchoolType;

  @ApiPropertyOptional({ description: 'Email manzil.', example: 'info@example.uz', format: 'email' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefon raqam E.164 formatida.', example: '+998712345678' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @Matches(/^\+998\d{9}$/)
  phone?: string;

  @ApiPropertyOptional({ description: 'Maktab asosiy oylik to‘lovi.', example: 1200000, minimum: 0, maximum: 100000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  monthlyPayment?: number;

  @ApiPropertyOptional({ description: 'To‘lov hisoblash boshlanish turi.', enum: PaymentStartStrategy, example: PaymentStartStrategy.FULL_ACADEMIC_YEAR })
  @IsOptional()
  @IsEnum(PaymentStartStrategy)
  paymentStartStrategy?: PaymentStartStrategy;

  @ApiPropertyOptional({ description: 'To‘lov davri birligi.', enum: PaymentPeriodUnit, example: PaymentPeriodUnit.YEAR })
  @IsOptional()
  @IsEnum(PaymentPeriodUnit)
  paymentPeriodUnit?: PaymentPeriodUnit;

  @ApiPropertyOptional({ description: 'Haftalik ish kunlari.', enum: WorkDays, example: WorkDays.FIVE_DAYS })
  @IsOptional()
  @IsEnum(WorkDays)
  workDays?: WorkDays;

  @ApiPropertyOptional({ description: 'Har bir guruh uchun alohida oylik to‘lov yoqilganligi.', example: false })
  @IsOptional()
  @IsBoolean()
  separateGroupPayments?: boolean;

  @ApiPropertyOptional({ description: 'Guruhlar kesimida alohida oylik to‘lovlar.', type: [GroupMonthlyPaymentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => GroupMonthlyPaymentDto)
  groupMonthlyPayments?: GroupMonthlyPaymentDto[];

  @ApiProperty({ description: 'Umumiy sig‘im.', example: 400, minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  totalCapacity: number;

  @ApiProperty({ description: 'Boshlang‘ich sinflar sig‘imi.', example: 140, minimum: 0, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  elementaryCapacity: number;

  @ApiProperty({ description: 'Yuqori sinflar sig‘imi.', example: 260, minimum: 0, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  upperCapacity: number;

  @ApiPropertyOptional({ description: 'Logo fayli IDsi. Fayl moduli orqali yuklangan asset IDsi.', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  logoFileId?: string;

  @ApiPropertyOptional({ description: 'Logo URL manzili.', example: 'https://cdn.example.uz/logo.png' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsUrl({ require_protocol: true })
  logoUrl?: string;
}
