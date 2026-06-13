import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { DataEntityType, DataJobStatus, DataJobType } from '../enums/imports-exports.enums';

export class CreateDataJobDto {
  @ApiProperty({ enum: DataJobType }) @IsEnum(DataJobType) type: DataJobType;
  @ApiProperty({ enum: DataEntityType }) @IsEnum(DataEntityType) entityType: DataEntityType;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() requestedById?: string;
}
export class UpdateDataJobDto {
  @ApiPropertyOptional({ enum: DataJobStatus }) @IsOptional() @IsEnum(DataJobStatus) status?: DataJobStatus;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalRows?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) successRows?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) failedRows?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() resultFileUrl?: string;
  @ApiPropertyOptional({ type: [Object] }) @IsOptional() @IsArray() errorReport?: Record<string, unknown>[];
}
