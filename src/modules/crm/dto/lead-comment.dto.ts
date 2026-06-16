import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from "class-validator";
import { LeadAssigneeBriefDto } from "./lead-response.dto";

export class CreateLeadCommentDto {
  @ApiProperty({
    example: "Mijozga yana bir bor eslatish kerak ertaga soat 8 da.",
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @Length(1, 2000)
  body: string;

  @ApiPropertyOptional({
    example: "2026-06-16T03:00:00.000Z",
    format: "date-time",
    description: "Eslatma uchun follow-up vaqti (ixtiyoriy).",
  })
  @IsOptional()
  @IsISO8601()
  remindAt?: string;

  @ApiPropertyOptional({ example: false, description: "Izohni tepaga qadab qo'yish." })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class UpdateLeadCommentDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  body?: string;

  @ApiPropertyOptional({
    nullable: true,
    format: "date-time",
    description: "Yangi follow-up vaqti, yoki null — eslatmani olib tashlash.",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  remindAt?: string | null;

  @ApiPropertyOptional({ description: "Eslatma bajarildi deb belgilash." })
  @IsOptional()
  @IsBoolean()
  reminderDone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class LeadCommentResponseDto {
  @ApiProperty({ example: "a1f35a94-92b4-4f1a-8a7a-90a78003892d", format: "uuid" })
  id: string;

  @ApiProperty({ example: "Mijozga yana bir bor eslatish kerak ertaga soat 8 da." })
  body: string;

  @ApiPropertyOptional({ type: LeadAssigneeBriefDto, nullable: true, description: "Izoh muallifi." })
  author?: LeadAssigneeBriefDto | null;

  @ApiPropertyOptional({ example: "2026-06-16T03:00:00.000Z", format: "date-time", nullable: true })
  remindAt?: string | null;

  @ApiProperty({ example: false, description: "Eslatma bajarilgan-bajarilmaganligi." })
  reminderDone: boolean;

  @ApiProperty({ example: false })
  isPinned: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: "Amalga bog'liq kontekst (masalan bosqich o'zgarishi).",
    example: { statusFrom: "new", statusTo: "contacted" },
  })
  context?: Record<string, unknown> | null;

  @ApiProperty({ example: "2026-06-15T12:22:00.000Z", format: "date-time" })
  createdAt: string;

  @ApiProperty({ example: "2026-06-15T12:22:00.000Z", format: "date-time" })
  updatedAt: string;
}
