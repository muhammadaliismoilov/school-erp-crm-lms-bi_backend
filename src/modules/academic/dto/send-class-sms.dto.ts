import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from "class-validator";

const trim = (value: unknown): unknown => (typeof value === "string" ? value.trim() : value);

export class SendClassSmsDto {
  @ApiPropertyOptional({
    description:
      "Tayyor SMS shablon IDsi. Berilsa, matn shablondan olinadi va `body` ixtiyoriy bo‘ladi.",
    example: "5c617a45-57a4-4864-89c8-96e299173908",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description:
      "SMS matni. `templateId` berilmaganida majburiy. Shablon va matn birga berilsa, matn ustun turadi.",
    example: "Hurmatli ota-onalar, ertaga ota-onalar yig‘ilishi bo‘lib o‘tadi.",
    minLength: 1,
    maxLength: 1000,
  })
  @ValidateIf((dto: SendClassSmsDto) => !dto.templateId || dto.body !== undefined)
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(1, 1000)
  body?: string;

  @ApiPropertyOptional({
    description:
      "Aniq o‘quvchilarga yuborish uchun IDlar. Berilmasa, sinfning barcha o‘quvchilariga yuboriladi.",
    type: [String],
    format: "uuid",
    maxItems: 500,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  studentIds?: string[];

  @ApiPropertyOptional({
    description:
      "SMSni rejalashtirish vaqti (ISO 8601). Berilmasa yoki o‘tmishda bo‘lsa, SMS darhol yuboriladi.",
    example: "2026-06-20T09:00:00.000Z",
    format: "date-time",
  })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
