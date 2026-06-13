import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTimetableTemplateDto {
  @ApiProperty() @IsString()
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  classId?: string;

  @ApiProperty() @IsBoolean()
  isActive: boolean;

}
export class UpdateTimetableTemplateDto extends PartialType(CreateTimetableTemplateDto) {}

export class CreateTimetableSlotDto {
  @ApiProperty() @IsUUID()
  templateId: string;

  @ApiProperty() @IsUUID()
  classId: string;

  @ApiProperty() @IsUUID()
  subjectId: string;

  @ApiProperty() @IsUUID()
  teacherId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  roomId?: string;

  @ApiProperty() @Type(() => Number) @IsInt() @Min(0)
  weekday: number;

  @ApiProperty() @IsString()
  startTime: string;

  @ApiProperty() @IsString()
  endTime: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;

}
export class UpdateTimetableSlotDto extends PartialType(CreateTimetableSlotDto) {}

export class CreateTimetableSubstitutionDto {
  @ApiProperty() @IsUUID()
  slotId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  originalTeacherId?: string;

  @ApiProperty() @IsUUID()
  substituteTeacherId: string;

  @ApiProperty() @IsISO8601({ strict: true })
  date: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  reason?: string;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateTimetableSubstitutionDto extends PartialType(CreateTimetableSubstitutionDto) {}

export class CreateTimetableConflictDto {
  @ApiProperty() @IsUUID()
  slotId: string;

  @ApiProperty() @IsString()
  conflictType: string;

  @ApiProperty() @IsString()
  message: string;

  @ApiProperty() @IsBoolean()
  resolved: boolean;

}
export class UpdateTimetableConflictDto extends PartialType(CreateTimetableConflictDto) {}
