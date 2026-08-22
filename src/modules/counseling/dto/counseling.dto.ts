import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

const SESSION_TYPES = ["individual", "group", "assessment", "follow_up"];
const RISK_LEVELS = ["low", "medium", "high"];

/** `GET /counseling/sessions` — sahifalash uchun (`search` ishlatilmaydi). */
export class QuerySessionsDto extends PaginationQueryDto {}

export class CreateCounselingSessionDto {
  @ApiProperty()
  @IsUUID()
  studentId: string;

  @ApiProperty()
  @IsUUID()
  counselorId: string;

  @ApiProperty()
  @IsISO8601({ strict: true })
  sessionDate: string;

  @ApiProperty({ enum: SESSION_TYPES })
  @IsIn(SESSION_TYPES)
  sessionType: string;

  @ApiProperty({ description: "Plaintext clinical notes; encrypted at rest." })
  @IsString()
  @MaxLength(20000)
  notes: string;

  @ApiPropertyOptional({ enum: RISK_LEVELS })
  @IsOptional()
  @IsIn(RISK_LEVELS)
  riskLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: true })
  followUpDate?: string;
}

export class UpdateCounselingSessionDto extends PartialType(
  CreateCounselingSessionDto,
) {}
