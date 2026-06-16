import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsHexColor, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateLeadTagDto {
  @ApiProperty({ example: "Issiq", minLength: 1, maxLength: 60 })
  @IsString()
  @Length(1, 60)
  name: string;

  @ApiPropertyOptional({ example: "#22c55e", description: "Chip rangi (hex)." })
  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateLeadTagDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 60 })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  name?: string;

  @ApiPropertyOptional({ example: "#22c55e" })
  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class SetLeadTagsDto {
  @ApiProperty({ type: [String], format: "uuid", description: "Lidga biriktiriladigan teg IDlari." })
  @IsArray()
  @IsUUID("4", { each: true })
  tagIds: string[];
}

export class LeadTagResponseDto {
  @ApiProperty({ example: "5c617a45-57a4-4864-89c8-96e299173908", format: "uuid" })
  id: string;

  @ApiProperty({ example: "Issiq" })
  name: string;

  @ApiPropertyOptional({ example: "#22c55e", nullable: true })
  color?: string | null;

  @ApiPropertyOptional({ example: 7, description: "Shu teg biriktirilgan lidlar soni." })
  leadCount?: number;
}
