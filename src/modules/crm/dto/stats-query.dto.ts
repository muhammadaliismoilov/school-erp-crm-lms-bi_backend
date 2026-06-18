import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional } from "class-validator";

/** Date range for the CRM statistics dashboard. Filters by lead `createdAt`. */
export class StatsQueryDto {
  @ApiPropertyOptional({
    description: "Davr boshi (shu sanadan boshlab yaratilgan lidlar). Berilmasa — boshidan.",
    format: "date-time",
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: "Davr oxiri (shu sanagacha yaratilgan lidlar). Berilmasa — hozirgacha.",
    format: "date-time",
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
