import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsHexColor, IsISO8601, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { ReferralTemplate } from "../enums/referral-template.enum";

export class CreateReferralDto {
  @ApiProperty({ example: "Instagram bahor aksiyasi", minLength: 1, maxLength: 120 })
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiPropertyOptional({ example: "Bahorgi chegirma kampaniyasi uchun referal", maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiPropertyOptional({ format: "uuid", description: "Manba (LeadSource) IDsi." })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({ example: "2026-06-30T23:59:59.000Z", format: "date-time", description: "Amal qilish muddati." })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: ReferralTemplate, example: ReferralTemplate.CLASSIC })
  @IsOptional()
  @IsEnum(ReferralTemplate)
  template?: ReferralTemplate;

  @ApiPropertyOptional({ example: "#22c55e", description: "Landing sahifa mavzu rangi (hex)." })
  @IsOptional()
  @IsHexColor()
  themeColor?: string;
}
