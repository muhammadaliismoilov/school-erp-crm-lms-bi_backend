import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateGeofenceFullDto {
  @ApiProperty({ example: 'Bosh ofis' }) @IsString() @Length(1, 160) name: string;
  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @ApiPropertyOptional({ minimum: 1, description: 'Radius (metr).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) radiusM?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateGeofenceFullDto extends PartialType(CreateGeofenceFullDto) {}

export class GeofenceQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) search?: string;
}
