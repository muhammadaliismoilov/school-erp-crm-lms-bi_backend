import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsOptional, IsString, Length } from "class-validator";
import { LeadStatus } from "../enums/lead-status.enum";

export class MoveLeadDto {
  @ApiProperty({ description: "Lidning yangi holati (kanban ustuni).", enum: LeadStatus })
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @ApiPropertyOptional({
    example: "Aloqaga chiqildi, ertaga qayta qo'ng'iroq qilamiz.",
    maxLength: 2000,
    description: "Bosqich o'zgarishi bilan birga yoziladigan izoh (ixtiyoriy).",
  })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  comment?: string;

  @ApiPropertyOptional({
    example: "2026-06-16T03:00:00.000Z",
    format: "date-time",
    description: "Izoh uchun follow-up eslatma vaqti (ixtiyoriy).",
  })
  @IsOptional()
  @IsISO8601()
  remindAt?: string;
}
