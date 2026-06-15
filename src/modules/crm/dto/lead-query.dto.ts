import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { LeadStatus } from "../enums/lead-status.enum";

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
}
