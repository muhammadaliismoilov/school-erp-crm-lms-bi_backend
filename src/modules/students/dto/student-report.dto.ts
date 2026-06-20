import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from "class-validator";

export class UpsertConclusionDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ description: "Tutor izohi" })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  tutorNote?: string;

  @ApiPropertyOptional({ description: "Tutor metrikalari (kalit → ball)" })
  @IsOptional()
  @IsObject()
  tutorMetrics?: Record<string, number>;

  @ApiPropertyOptional({ description: "Psixolog izohi" })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  psychologistNote?: string;

  @ApiPropertyOptional({ description: "Psixolog metrikalari (kalit → ball)" })
  @IsOptional()
  @IsObject()
  psychMetrics?: Record<string, number>;
}

export class SmartGoalItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsString()
  @Length(1, 400)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deadline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  result?: string | null;
}

export class UpsertSmartGoalsDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ description: "Sajiya-xulq" })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  characterNote?: string;

  @ApiPropertyOptional({ description: "Rivojlanish" })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  developmentNote?: string;

  @ApiPropertyOptional({ description: "Mehnat harakatlari" })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  workNote?: string;

  @ApiPropertyOptional({ type: [SmartGoalItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmartGoalItemDto)
  smartGoals?: SmartGoalItemDto[];
}
