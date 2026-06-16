import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LeadStatus } from "../enums/lead-status.enum";

export class LeadSourceBriefDto {
  @ApiProperty({ example: "5c617a45-57a4-4864-89c8-96e299173908", format: "uuid" })
  id: string;

  @ApiProperty({ example: "Instagram" })
  name: string;
}

export class LeadAssigneeBriefDto {
  @ApiProperty({ example: "8cf35a94-92b4-4f1a-8a7a-90a78003892d", format: "uuid" })
  id: string;

  @ApiProperty({ example: "Aziz Toshmatov" })
  fullName: string;
}

export class LeadTagBriefDto {
  @ApiProperty({ example: "5c617a45-57a4-4864-89c8-96e299173908", format: "uuid" })
  id: string;

  @ApiProperty({ example: "Issiq" })
  name: string;

  @ApiPropertyOptional({ example: "#22c55e", nullable: true })
  color?: string | null;
}

export class LeadResponseDto {
  @ApiProperty({ example: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7", format: "uuid" })
  id: string;

  @ApiProperty({ example: "Nodir" })
  firstName: string;

  @ApiPropertyOptional({ example: "Toshmatov", nullable: true })
  lastName?: string | null;

  @ApiProperty({ example: "Nodir Toshmatov" })
  fullName: string;

  @ApiProperty({ example: "+998901234567" })
  phone: string;

  @ApiPropertyOptional({ example: "parent@example.com", nullable: true })
  email?: string | null;

  @ApiProperty({ enum: LeadStatus, example: LeadStatus.NEW })
  status: LeadStatus;

  @ApiPropertyOptional({ type: LeadSourceBriefDto, nullable: true })
  source?: LeadSourceBriefDto | null;

  @ApiPropertyOptional({ type: LeadAssigneeBriefDto, nullable: true })
  assignedTo?: LeadAssigneeBriefDto | null;

  @ApiPropertyOptional({ example: "5-sinfga qiziqyapti", nullable: true })
  notes?: string | null;

  @ApiPropertyOptional({ example: "REF-2026", nullable: true })
  referralCode?: string | null;

  @ApiPropertyOptional({
    example: "f0ff63e5-9fc8-4a9a-83de-9453d328d0d7",
    format: "uuid",
    nullable: true,
    description: "Lid o'quvchiga aylantirilgan bo'lsa — student IDsi.",
  })
  enrolledStudentId?: string | null;

  @ApiProperty({ type: [LeadTagBriefDto], description: "Lidga biriktirilgan teglar." })
  tags: LeadTagBriefDto[];

  @ApiPropertyOptional({ example: 3, description: "Lidga yozilgan izohlar soni (faqat detalda)." })
  commentsCount?: number;

  @ApiPropertyOptional({
    example: "2026-06-16T03:00:00.000Z",
    format: "date-time",
    nullable: true,
    description: "Eng yaqin bajarilmagan follow-up eslatma vaqti (faqat detalda).",
  })
  nextReminderAt?: string | null;

  @ApiPropertyOptional({ example: "2026-06-14T12:00:00.000Z", format: "date-time" })
  createdAt?: string;

  @ApiPropertyOptional({ example: "2026-06-14T12:00:00.000Z", format: "date-time" })
  updatedAt?: string;
}

export class LeadStatsDto {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 40 })
  new: number;

  @ApiProperty({ example: 20 })
  contacted: number;

  @ApiProperty({ example: 17 })
  interested: number;

  @ApiProperty({ example: 10 })
  trial_lesson: number;

  @ApiProperty({ example: 8 })
  contract: number;

  @ApiProperty({ example: 5 })
  rejected: number;
}

export class LeadPageMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  pageCount: number;
}

export class LeadListResultDto {
  @ApiProperty({ type: [LeadResponseDto] })
  items: LeadResponseDto[];

  @ApiProperty({ type: LeadPageMetaDto })
  meta: LeadPageMetaDto;

  @ApiProperty({ type: LeadStatsDto })
  stats: LeadStatsDto;
}

export class SourceResponseDto {
  @ApiProperty({ example: "5c617a45-57a4-4864-89c8-96e299173908", format: "uuid" })
  id: string;

  @ApiProperty({ example: "Instagram" })
  name: string;

  @ApiProperty({ example: "INSTAGRAM" })
  code: string;

  @ApiPropertyOptional({ example: "instagram", nullable: true })
  icon?: string | null;

  @ApiProperty({ example: 12, description: "Shu manbadan kelgan lidlar soni." })
  leadCount: number;

  @ApiPropertyOptional({ example: "2026-06-14T12:00:00.000Z", format: "date-time" })
  createdAt?: string;
}
