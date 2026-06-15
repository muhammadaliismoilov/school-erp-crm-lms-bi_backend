import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, Length } from "class-validator";

const trim = (value: unknown): unknown =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

export class CreateSourceDto {
  @ApiProperty({ description: "Manba nomi.", example: "Instagram", minLength: 1, maxLength: 120 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiPropertyOptional({ description: "Ixtiyoriy ikona/rang belgisi.", example: "instagram", maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Length(1, 80)
  icon?: string;
}
