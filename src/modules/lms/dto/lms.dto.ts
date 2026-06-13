import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { ExamStatus, LessonStatus } from '../enums/lms.enums';

export class CreateLessonScheduleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() classId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() roomId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() lessonPeriodId?: string;
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: true }) lessonDate: string;
  @ApiPropertyOptional({ enum: LessonStatus }) @IsOptional() @IsEnum(LessonStatus) status?: LessonStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() topic?: string;
}
export class UpdateLessonScheduleDto extends PartialType(CreateLessonScheduleDto) {}
export class CreateJournalEntryDto { @ApiProperty({ format: 'uuid' }) @IsUUID() lessonId: string; @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5) grade?: number; @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() homeworkDone?: boolean; @ApiPropertyOptional() @IsOptional() @IsString() comment?: string; }
export class UpdateJournalEntryDto extends PartialType(CreateJournalEntryDto) {}
export class CreateExamDto { @ApiProperty() @IsString() @Length(2, 120) title: string; @ApiProperty({ format: 'uuid' }) @IsUUID() classId: string; @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId: string; @ApiProperty({ format: 'date' }) @IsISO8601({ strict: true }) examDate: string; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) maxScore?: number; @ApiPropertyOptional({ enum: ExamStatus }) @IsOptional() @IsEnum(ExamStatus) status?: ExamStatus; }
export class UpdateExamDto extends PartialType(CreateExamDto) {}
export class CreateExamResultDto { @ApiProperty({ format: 'uuid' }) @IsUUID() examId: string; @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string; @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) score: number; @ApiPropertyOptional() @IsOptional() @IsString() comment?: string; }
export class UpdateExamResultDto extends PartialType(CreateExamResultDto) {}
