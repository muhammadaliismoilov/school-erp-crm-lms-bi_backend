import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import {
  AchievementCategory,
  AchievementIcon,
  AchievementRank,
} from "../enums/achievement.enum";

export class CreateAchievementDto {
  @ApiProperty({ example: "Matematika olimpiadasi", maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ enum: AchievementCategory })
  @IsEnum(AchievementCategory)
  category: AchievementCategory;

  @ApiProperty({ enum: AchievementRank })
  @IsEnum(AchievementRank)
  rank: AchievementRank;

  @ApiPropertyOptional({ enum: AchievementIcon, default: AchievementIcon.TROPHY })
  @IsOptional()
  @IsEnum(AchievementIcon)
  icon?: AchievementIcon;

  @ApiPropertyOptional({ example: "2026-05-12", format: "date" })
  @IsOptional()
  @IsISO8601({ strict: true })
  achievedAt?: string;

  @ApiPropertyOptional({ example: "Maktab - 1-sinflar", maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  organization?: string;

  @ApiPropertyOptional({ example: "Yutuq haqida ma'lumot" })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiPropertyOptional({ example: "https://cdn/certificate.pdf" })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  certificateUrl?: string;
}

export class UpdateAchievementDto extends PartialType(CreateAchievementDto) {}

export class QueryAchievementsDto {
  @ApiPropertyOptional({ enum: AchievementCategory })
  @IsOptional()
  @IsEnum(AchievementCategory)
  category?: AchievementCategory;
}
