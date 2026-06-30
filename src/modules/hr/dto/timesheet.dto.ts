import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TimesheetStatus } from '../enums/hr.enums';

export class TimesheetLineDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() staffMemberId: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 31 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(31) workedDays?: number;
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) workedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 500) note?: string;
}

export class CreateTimesheetDto {
  @ApiProperty({ example: 2026 }) @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year: number;
  @ApiProperty({ example: 6 }) @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 1000) note?: string;
  @ApiPropertyOptional({ type: [TimesheetLineDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimesheetLineDto)
  lines?: TimesheetLineDto[];
}

export class UpdateTimesheetDto extends PartialType(CreateTimesheetDto) {}

export class TimesheetQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() month?: number;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional({ enum: TimesheetStatus }) @IsOptional() @IsEnum(TimesheetStatus) status?: TimesheetStatus;
}
