import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum ScheduleGenerateMode {
  ADD = 'add',
  REFRESH = 'refresh',
}

// --------------------------------------------------------------- Query DTOs

export class ScheduleClassesQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;
}

export class ScheduleGridQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() classId: string;
}

export class ScheduleTeacherGridQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() teacherId: string;
}

export class ScheduleConflictsQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;
}

export class ScheduleHistoryQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() classId?: string;
}

// --------------------------------------------------------------- Mutation DTOs

export class CreateScheduleCellDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() classId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() lessonPeriodId: string;
  @ApiProperty({ minimum: 1, maximum: 7, description: 'ISO hafta kuni (1=Dushanba … 7=Yakshanba)' })
  @Type(() => Number) @IsInt() @Min(1) @Max(7) weekday: number;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() subjectId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() roomId?: string;
  @ApiPropertyOptional({ format: 'uuid', description: '"Kurs jadvali" rejimi' })
  @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional({ default: false, description: 'Yoqilsa darslar bugundan, aks holda chorak boshidan yaratiladi' })
  @IsOptional() @Type(() => Boolean) @IsBoolean() fromToday?: boolean;
}

export class UpdateScheduleCellDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() subjectId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() roomId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() courseId?: string;
}

export class GenerateDistributionItemDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() classId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() roomId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() courseId?: string;
  @ApiProperty({ minimum: 1, maximum: 40, description: 'Haftasiga soatlar soni' })
  @Type(() => Number) @IsInt() @Min(1) @Max(40) hoursPerWeek: number;
}

export class GenerateScheduleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;
  @ApiProperty({ enum: ScheduleGenerateMode, default: ScheduleGenerateMode.ADD })
  @IsEnum(ScheduleGenerateMode) mode: ScheduleGenerateMode;
  @ApiProperty({ type: [Number], description: 'Dars kunlari, ISO weekday (1..7)' })
  @IsArray() @ArrayNotEmpty() @ArrayUnique()
  @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  days: number[];
  @ApiProperty({ minimum: 1, maximum: 20 })
  @Type(() => Number) @IsInt() @Min(1) @Max(20) maxPerDay: number;
  @ApiProperty({ minimum: 1, maximum: 10 })
  @Type(() => Number) @IsInt() @Min(1) @Max(10) maxPerSubjectPerDay: number;
  @ApiProperty({ type: [GenerateDistributionItemDto] })
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true })
  @Type(() => GenerateDistributionItemDto)
  distribution: GenerateDistributionItemDto[];
}

export class SubstituteTeacherDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quarterId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() classId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() lessonPeriodId: string;
  @ApiProperty({ minimum: 1, maximum: 7 })
  @Type(() => Number) @IsInt() @Min(1) @Max(7) weekday: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() substituteTeacherId: string;
  @ApiProperty({ minimum: 1, maximum: 50, description: 'Almashtiriladigan kelgusi darslar soni' })
  @Type(() => Number) @IsInt() @Min(1) @Max(50) count: number;
}
