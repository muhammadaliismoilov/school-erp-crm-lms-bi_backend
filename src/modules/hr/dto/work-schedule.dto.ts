import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Weekday } from '../entities/work-schedule-day.entity';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WorkScheduleDayDto {
  @ApiProperty({ enum: Weekday }) @IsEnum(Weekday) weekday: Weekday;
  @ApiPropertyOptional({ example: '09:00' }) @IsOptional() @Matches(TIME_RE) startTime?: string;
  @ApiPropertyOptional({ example: '18:00' }) @IsOptional() @Matches(TIME_RE) endTime?: string;
  @ApiPropertyOptional({ example: '13:00' }) @IsOptional() @Matches(TIME_RE) lunchStart?: string;
  @ApiPropertyOptional({ example: '14:00' }) @IsOptional() @Matches(TIME_RE) lunchEnd?: string;
}

export class CreateWorkScheduleDto {
  @ApiProperty({ example: 'Standart 5 kunlik' }) @IsString() @Length(1, 160) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isStandard?: boolean;
  @ApiPropertyOptional({ type: [WorkScheduleDayDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => WorkScheduleDayDto)
  days?: WorkScheduleDayDto[];
}

export class UpdateWorkScheduleDto extends PartialType(CreateWorkScheduleDto) {}

export class WorkScheduleQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) search?: string;
}
