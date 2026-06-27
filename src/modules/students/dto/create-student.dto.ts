import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  Gender,
  StudentLanguage,
  StudentStatus,
} from "../enums/student-status.enum";

/** Qo‘shimcha hujjat checkboxlari (drawer "Qo‘shimcha hujjatlar" bo‘limi). */
export class ExtraDocumentsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() tabelGuvohnoma?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() passportNusxa?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() tibbiyDaftarcha?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() rasmlar?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() baholarVaraqasi?: boolean;
}

export class CreateStudentDto {
  // --- Umumiy ---
  @ApiProperty({ example: "Ali", minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  firstName: string;

  @ApiProperty({ example: "Valiyev", minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  lastName: string;

  @ApiPropertyOptional({ example: "Akmalovich", maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  middleName?: string;

  // --- Asosiy ---
  @ApiPropertyOptional({ example: "2015-03-20", format: "date" })
  @IsOptional()
  @IsISO8601({ strict: true })
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: StudentLanguage, example: StudentLanguage.UZ })
  @IsOptional()
  @IsEnum(StudentLanguage)
  preferredLanguage?: StudentLanguage;

  @ApiPropertyOptional({ example: "12345678901234", maxLength: 32, description: "Hujjat raqami / JSHSHIR" })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  nationalId?: string;

  @ApiPropertyOptional({ example: "https://cdn/photo.jpg" })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  // --- O'qish ---
  @ApiPropertyOptional({
    example: "ST-2026-0001",
    minLength: 3,
    maxLength: 40,
    description: "Bo‘sh qoldirilsa server avtomatik generatsiya qiladi.",
  })
  @IsOptional()
  @IsString()
  @Length(3, 40)
  @Matches(/^[A-Z0-9-]+$/)
  studentCode?: string;

  @ApiPropertyOptional({ format: "uuid", description: "Joriy sinf" })
  @IsOptional()
  @IsUUID()
  currentClassId?: string;

  @ApiPropertyOptional({ example: "SH-2026-145", maxLength: 60 })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  contractNumber?: string;

  @ApiPropertyOptional({ enum: StudentStatus, example: StudentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  // --- Chegirma ---
  @ApiPropertyOptional({ example: 25, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  // --- Billing (oylik tarif + chegirma) ---
  @ApiPropertyOptional({ example: 2050000, minimum: 0, description: "Oylik to'lov tarifi." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyFee?: number;

  @ApiPropertyOptional({ enum: ["percent", "amount"], example: "percent" })
  @IsOptional()
  @IsIn(["percent", "amount"])
  discountType?: "percent" | "amount";

  @ApiPropertyOptional({ example: 10, minimum: 0, description: "Chegirma qiymati (foiz yoki so'm)." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ example: "2026-09-01", description: "To'lov hisobi boshlanish sanasi." })
  @IsOptional()
  @IsISO8601()
  billingStartDate?: string;

  @ApiPropertyOptional({ enum: ["yearly_1x", "split_2", "split_3", "monthly"], description: "Tanlangan to'lov rejasi." })
  @IsOptional()
  @IsIn(["yearly_1x", "split_2", "split_3", "monthly"])
  paymentPlan?: "yearly_1x" | "split_2" | "split_3" | "monthly";

  @ApiPropertyOptional({ enum: ["percent", "amount"], description: "Reja chegirma override turi (ixtiyoriy)." })
  @IsOptional()
  @IsIn(["percent", "amount"])
  planDiscountOverrideType?: "percent" | "amount";

  @ApiPropertyOptional({ example: 1800000, minimum: 0, description: "Reja chegirma override qiymati." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  planDiscountOverrideValue?: number;

  // --- Manzil ---
  @ApiPropertyOptional({ example: "Toshkent", maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  region?: string;

  @ApiPropertyOptional({ example: "Yunusobod", maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  district?: string;

  @ApiPropertyOptional({ example: "5-mavze, 12-uy" })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string;

  @ApiPropertyOptional({ example: "+998901112233", maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(3, 32)
  personalPhone?: string;

  // --- Qiziqishlar ---
  @ApiPropertyOptional({ type: [String], example: ["Shaxmat", "Futbol"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  // --- Qo'shimcha hujjatlar ---
  @ApiPropertyOptional({ type: ExtraDocumentsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExtraDocumentsDto)
  extraDocuments?: ExtraDocumentsDto;

  // --- Ixtiyoriy asosiy vasiy (telefon ustuni uchun) ---
  @ApiPropertyOptional({ example: "Valiyev Akmal", maxLength: 160 })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  guardianFullName?: string;

  @ApiPropertyOptional({ example: "father", maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  guardianRelation?: string;

  @ApiPropertyOptional({ example: "+998909066628", maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(3, 32)
  guardianPhone?: string;
}
