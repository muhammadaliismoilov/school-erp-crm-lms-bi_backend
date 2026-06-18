import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LeadStatus } from "../enums/lead-status.enum";

// --------------------------------------------------------------- Overview

export class StatusCountDto {
  @ApiProperty({ enum: LeadStatus, example: LeadStatus.NEW })
  status: LeadStatus;

  @ApiProperty({ example: 42 })
  count: number;
}

export class TrendPointDto {
  @ApiProperty({ example: "2026-06-15", description: "ISO sana (YYYY-MM-DD)." })
  date: string;

  @ApiProperty({ example: 7 })
  count: number;
}

export class OverviewStatsDto {
  @ApiProperty({ example: 1280, description: "Jami lidlar (butun davr bo'yicha)." })
  totalLeads: number;

  @ApiProperty({ example: 96, description: "Tanlangan davrda yaratilgan lidlar." })
  newLeads: number;

  @ApiPropertyOptional({ example: 12.5, nullable: true, description: "Yangi lidlar — oldingi davrga nisbatan %." })
  newLeadsDelta: number | null;

  @ApiProperty({ example: 18.4, description: "Konversiya % (qabulga yetganlar / davr lidlari)." })
  conversionRate: number;

  @ApiPropertyOptional({ example: -3.1, nullable: true, description: "Konversiya — oldingi davrga nisbatan %." })
  conversionRateDelta: number | null;

  @ApiPropertyOptional({ example: 6.3, nullable: true, description: "O'rtacha sikl (kun): yaratilgandan qabulgacha." })
  avgCycleDays: number | null;

  @ApiProperty({ type: [TrendPointDto], description: "Kunlik yangi lidlar trendi." })
  trend: TrendPointDto[];

  @ApiProperty({ type: [StatusCountDto], description: "Status bo'yicha taqsimot (donut)." })
  statusDistribution: StatusCountDto[];
}

// ------------------------------------------------------------ Funnel

export class FunnelStageDto {
  @ApiProperty({ example: "contacted", description: "Bosqich kaliti (status yoki 'enrolled')." })
  stage: string;

  @ApiProperty({ example: 320, description: "Shu bosqichga yetgan lidlar (kumulyativ)." })
  count: number;

  @ApiProperty({ example: 33.3, description: "Davr lidlaridan % ulush." })
  reachedPct: number;

  @ApiPropertyOptional({ example: 71.2, nullable: true, description: "Oldingi bosqichdan o'tish %." })
  stepConversion: number | null;
}

export class FunnelStatsDto {
  @ApiProperty({ type: [FunnelStageDto] })
  stages: FunnelStageDto[];

  @ApiProperty({ example: 18.4, description: "Umumiy konversiya (qabul / jami)." })
  overallConversion: number;
}

// ------------------------------------------------------------ Quality

export class QualityStatsDto {
  @ApiProperty({ example: 14.2, description: "Rad etish darajasi %." })
  rejectionRate: number;

  @ApiProperty({ example: 18 })
  rejectedCount: number;

  @ApiPropertyOptional({ example: 6.3, nullable: true, description: "O'rtacha sikl (kun)." })
  avgCycleDays: number | null;

  @ApiProperty({ example: 9, description: "Qotib qolgan lidlar (harakatsiz, yopilmagan)." })
  stuckLeads: number;

  @ApiProperty({ example: 7, description: "Qotib qolgan deb hisoblash chegarasi (kun)." })
  stuckThresholdDays: number;
}

// ------------------------------------------------------------ Sources

export class SourceStatDto {
  @ApiPropertyOptional({ example: "5c617a45-57a4-4864-89c8-96e299173908", nullable: true, format: "uuid" })
  sourceId: string | null;

  @ApiProperty({ example: "Instagram" })
  name: string;

  @ApiProperty({ example: 240 })
  count: number;

  @ApiProperty({ example: 52, description: "Qabulga yetganlar." })
  converted: number;

  @ApiProperty({ example: 21.7, description: "Konversiya %." })
  conversion: number;
}

// ------------------------------------------------------------ Managers

export class ManagerStatDto {
  @ApiPropertyOptional({ example: "8cf35a94-92b4-4f1a-8a7a-90a78003892d", nullable: true, format: "uuid" })
  userId: string | null;

  @ApiProperty({ example: "Aziz Toshmatov" })
  name: string;

  @ApiProperty({ example: 64 })
  count: number;

  @ApiProperty({ example: 14, description: "Qabulga yetganlar." })
  converted: number;

  @ApiProperty({ example: 21.9, description: "Konversiya %." })
  conversion: number;

  @ApiProperty({ example: 38, description: "Ochiq (jarayondagi) lidlar." })
  open: number;

  @ApiProperty({ example: 26, description: "Yopilgan (shartnoma yoki rad) lidlar." })
  closed: number;

  @ApiPropertyOptional({ example: 4.5, nullable: true, description: "O'rtacha birinchi aloqa vaqti (soat)." })
  avgResponseHours: number | null;
}

// ------------------------------------------------------------ Segments

export class TagSegmentDto {
  @ApiProperty({ example: "5c617a45-57a4-4864-89c8-96e299173908", format: "uuid" })
  tagId: string;

  @ApiProperty({ example: "Issiq" })
  name: string;

  @ApiPropertyOptional({ example: "#22c55e", nullable: true })
  color: string | null;

  @ApiProperty({ example: 58 })
  count: number;

  @ApiProperty({ example: 19 })
  converted: number;

  @ApiProperty({ example: 32.8 })
  conversion: number;
}

export class CohortPointDto {
  @ApiProperty({ example: "2026-W24", description: "Davr yorlig'i (ISO hafta)." })
  period: string;

  @ApiProperty({ example: 31 })
  newLeads: number;

  @ApiProperty({ example: 6 })
  converted: number;
}

export class SourceStageCellDto {
  @ApiPropertyOptional({ example: "5c617a45-57a4-4864-89c8-96e299173908", nullable: true, format: "uuid" })
  sourceId: string | null;

  @ApiProperty({ example: "Instagram" })
  sourceName: string;

  @ApiProperty({ enum: LeadStatus, example: LeadStatus.INTERESTED })
  status: LeadStatus;

  @ApiProperty({ example: 12 })
  count: number;
}

export class SegmentStatsDto {
  @ApiProperty({ type: [TagSegmentDto], description: "Teglar bo'yicha taqsimot." })
  tags: TagSegmentDto[];

  @ApiProperty({ type: [CohortPointDto], description: "Haftalik kohorta trendi." })
  cohort: CohortPointDto[];

  @ApiProperty({ type: [SourceStageCellDto], description: "Manba × bosqich xaritasi (heatmap)." })
  sourceStageHeatmap: SourceStageCellDto[];
}

// ------------------------------------------------------------ Root

export class StatsRangeDto {
  @ApiPropertyOptional({ example: "2026-06-01T00:00:00.000Z", nullable: true })
  from: string | null;

  @ApiPropertyOptional({ example: "2026-06-17T23:59:59.999Z", nullable: true })
  to: string | null;
}

export class LeadStatisticsDto {
  @ApiProperty({ type: StatsRangeDto })
  range: StatsRangeDto;

  @ApiProperty({ type: OverviewStatsDto })
  overview: OverviewStatsDto;

  @ApiProperty({ type: FunnelStatsDto })
  funnel: FunnelStatsDto;

  @ApiProperty({ type: QualityStatsDto })
  quality: QualityStatsDto;

  @ApiProperty({ type: [SourceStatDto] })
  sources: SourceStatDto[];

  @ApiProperty({ type: [ManagerStatDto] })
  managers: ManagerStatDto[];

  @ApiProperty({ type: SegmentStatsDto })
  segments: SegmentStatsDto;
}
