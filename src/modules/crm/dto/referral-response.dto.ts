import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReferralTemplate } from "../enums/referral-template.enum";
import { LeadSourceBriefDto } from "./lead-response.dto";

export class ReferralResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ example: "Instagram bahor aksiyasi" })
  name: string;

  @ApiProperty({ example: "5262804", description: "Public kod." })
  code: string;

  @ApiProperty({ example: "https://app.example.com/referral/5262804", description: "Ulashish havolasi." })
  url: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ type: LeadSourceBriefDto, nullable: true })
  source?: LeadSourceBriefDto | null;

  @ApiPropertyOptional({ format: "date-time", nullable: true })
  expiresAt?: string | null;

  @ApiProperty({ enum: ReferralTemplate })
  template: ReferralTemplate;

  @ApiPropertyOptional({ example: "#22c55e", nullable: true })
  themeColor?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: "active", enum: ["active", "expired"], description: "Hisoblangan holat." })
  status: "active" | "expired";

  @ApiProperty({ example: 12, description: "Shu referal orqali kelgan lidlar soni." })
  leadCount: number;

  @ApiPropertyOptional({ format: "date-time" })
  createdAt?: string;
}

export class ReferralStatsDto {
  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 7 })
  active: number;

  @ApiProperty({ example: 3 })
  expired: number;

  @ApiProperty({ example: 4, description: "Manbasi belgilangan referallar soni." })
  withSource: number;
}

export class ReferralListResultDto {
  @ApiProperty({ type: [ReferralResponseDto] })
  items: ReferralResponseDto[];

  @ApiProperty()
  meta: { page: number; limit: number; total: number; pageCount: number };

  @ApiProperty({ type: ReferralStatsDto })
  stats: ReferralStatsDto;
}

/** Public, minimal info returned for the landing page (no internal fields). */
export class PublicReferralInfoDto {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: "Instagram bahor aksiyasi" })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ enum: ReferralTemplate })
  template: ReferralTemplate;

  @ApiPropertyOptional({ example: "#22c55e", nullable: true })
  themeColor?: string | null;

  @ApiPropertyOptional({ example: "Instagram", nullable: true, description: "Manba nomi." })
  sourceName?: string | null;
}
