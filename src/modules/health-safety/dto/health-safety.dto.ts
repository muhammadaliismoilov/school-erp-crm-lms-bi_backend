import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateStudentHealthRecordDto {
  @ApiProperty() @IsUUID()
  studentId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  bloodType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  allergies?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  medicalNotes?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  emergencyContact?: string;

}
export class UpdateStudentHealthRecordDto extends PartialType(CreateStudentHealthRecordDto) {}

export class CreateNurseVisitDto {
  @ApiProperty() @IsUUID()
  studentId: string;

  @ApiProperty() @IsISO8601({ strict: true })
  visitedAt: string;

  @ApiProperty() @IsString()
  complaint: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  treatment?: string;

  @ApiProperty() @IsBoolean()
  followUpRequired: boolean;

}
export class UpdateNurseVisitDto extends PartialType(CreateNurseVisitDto) {}

export class CreateSafetyIncidentDto {
  @ApiProperty() @IsString()
  title: string;

  @ApiProperty() @IsISO8601({ strict: true })
  incidentAt: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  location?: string;

  @ApiProperty() @IsString()
  severity: string;

  @ApiProperty() @IsString()
  description: string;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateSafetyIncidentDto extends PartialType(CreateSafetyIncidentDto) {}

export class CreateEmergencyDrillDto {
  @ApiProperty() @IsString()
  name: string;

  @ApiProperty() @IsISO8601({ strict: true })
  drillDate: string;

  @ApiProperty() @IsString()
  drillType: string;

  @ApiProperty() @Type(() => Number) @IsInt() @Min(0)
  participantsCount: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;

}
export class UpdateEmergencyDrillDto extends PartialType(CreateEmergencyDrillDto) {}
