import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from "class-validator";

export enum ClassLanguage {
  UZ = "uz",
  RU = "ru",
  EN = "en",
}

const normalizeSection = (value: unknown): unknown =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export class CreateClassDto {
  @ApiProperty({
    description: "Sinf darajasi. Masalan: 1, 2, 3 ... 11.",
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel: number;

  @ApiProperty({
    description: "Sinf harfi yoki nom qismi. Backend uni katta harfga normallashtiradi.",
    example: "A",
    minLength: 1,
    maxLength: 4,
    pattern: "^[A-Z]$",
  })
  @Transform(({ value }) => normalizeSection(value))
  @IsString()
  @Length(1, 4)
  @Matches(/^[A-Z]$/)
  section: string;

  @ApiProperty({
    description: "Sinf taʼlim tili.",
    enum: ClassLanguage,
    example: ClassLanguage.UZ,
  })
  @IsEnum(ClassLanguage)
  language: ClassLanguage;

  @ApiProperty({
    description: "Sinf joylashgan xona IDsi.",
    example: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7",
    format: "uuid",
  })
  @IsUUID()
  roomId: string;

  @ApiProperty({
    description: "Sinf rahbari/kurator foydalanuvchi IDsi.",
    example: "8cf35a94-92b4-4f1a-8a7a-90a78003892d",
    format: "uuid",
  })
  @IsUUID()
  curatorId: string;

  @ApiProperty({
    description: "Sinf tegishli bo‘lgan o‘quv yili IDsi.",
    example: "5c617a45-57a4-4864-89c8-96e299173908",
    format: "uuid",
  })
  @IsUUID()
  academicYearId: string;

  @ApiPropertyOptional({
    description: "Sinf sig‘imi. UI uchun limit va rejalashtirishda ishlatiladi.",
    example: 30,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;

  @ApiPropertyOptional({ example: "general", minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  classType?: string;

  @ApiPropertyOptional({ example: "morning", minLength: 1, maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  shift?: string;
}
