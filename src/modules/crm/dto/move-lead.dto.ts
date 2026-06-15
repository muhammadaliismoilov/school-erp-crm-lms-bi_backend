import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { LeadStatus } from "../enums/lead-status.enum";

export class MoveLeadDto {
  @ApiProperty({ description: "Lidning yangi holati (kanban ustuni).", enum: LeadStatus })
  @IsEnum(LeadStatus)
  status: LeadStatus;
}
