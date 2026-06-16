import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsISO8601, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { LeadStatus } from "../enums/lead-status.enum";
import { LeadTaskFilter } from "../enums/lead-task-filter.enum";

export class LeadQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Lid holati bo'yicha filter.", enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ description: "Manba IDsi bo'yicha filter.", format: "uuid" })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional({ description: "Mas'ul menejer IDsi bo'yicha filter.", format: "uuid" })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: "Yaratilgan sanasi 'dan' (shu sanadan boshlab).", format: "date-time" })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: "Yaratilgan sanasi 'gacha' (shu sanagacha).", format: "date-time" })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ description: "Vazifa holati bo'yicha filter.", enum: LeadTaskFilter })
  @IsOptional()
  @IsEnum(LeadTaskFilter)
  taskFilter?: LeadTaskFilter;

  @ApiPropertyOptional({
    description: "Teg IDlari bo'yicha filter (vergul bilan yoki takror param).",
    type: [String],
    format: "uuid",
  })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : typeof value === "string" ? value.split(",").filter(Boolean) : value,
  )
  @IsArray()
  @IsUUID("4", { each: true })
  tagIds?: string[];
}
