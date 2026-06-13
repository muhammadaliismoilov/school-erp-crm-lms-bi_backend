import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { HomeworkStatus, SubmissionStatus } from '../enums/homework.enums';

export class CreateHomeworkAssignmentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() classId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() teacherId?: string;
  @ApiProperty() @IsString() @Length(3, 180) title: string;
  @ApiProperty() @IsString() @Length(3, 5000) description: string;
  @ApiProperty({ format: 'date-time' }) @IsISO8601() dueDate: string;
  @ApiPropertyOptional({ default: 100 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1000) maxScore?: number;
  @ApiPropertyOptional({ enum: HomeworkStatus }) @IsOptional() @IsEnum(HomeworkStatus) status?: HomeworkStatus;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) attachmentUrls?: string[];
}
export class UpdateHomeworkAssignmentDto extends PartialType(CreateHomeworkAssignmentDto) {}
export class SubmitHomeworkDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() assignmentId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() answer?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) attachmentUrls?: string[];
}
export class CheckHomeworkDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000) score?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() teacherComment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aiFeedback?: string;
  @ApiPropertyOptional({ enum: SubmissionStatus }) @IsOptional() @IsEnum(SubmissionStatus) status?: SubmissionStatus;
}
