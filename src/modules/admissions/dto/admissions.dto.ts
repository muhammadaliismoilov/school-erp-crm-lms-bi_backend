import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAdmissionPipelineDto {
  @ApiProperty() @IsString()
  name: string;

  @ApiProperty() @IsString()
  code: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiProperty() @IsBoolean()
  isActive: boolean;

}
export class UpdateAdmissionPipelineDto extends PartialType(CreateAdmissionPipelineDto) {}

export class CreateAdmissionStageDto {
  @ApiProperty() @IsUUID()
  pipelineId: string;

  @ApiProperty() @IsString()
  name: string;

  @ApiProperty() @IsString()
  code: string;

  @ApiProperty() @Type(() => Number) @IsInt() @Min(0)
  orderIndex: number;

  @ApiProperty() @IsBoolean()
  isFinal: boolean;

}
export class UpdateAdmissionStageDto extends PartialType(CreateAdmissionStageDto) {}

export class CreateAdmissionApplicationDto {
  @ApiProperty() @IsString()
  applicationNo: string;

  @ApiProperty() @IsString()
  studentFirstName: string;

  @ApiProperty() @IsString()
  studentLastName: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true })
  birthDate?: string;

  @ApiProperty() @IsString()
  parentFullName: string;

  @ApiProperty() @IsString()
  parentPhone: string;

  @ApiProperty() @IsString()
  gradeLevel: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  source?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  stageId?: string;

  @ApiProperty() @IsString()
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;

}
export class UpdateAdmissionApplicationDto extends PartialType(CreateAdmissionApplicationDto) {}

export class CreateEntranceExamDto {
  @ApiProperty() @IsUUID()
  applicationId: string;

  @ApiProperty() @IsString()
  subject: string;

  @ApiProperty() @IsISO8601({ strict: true })
  examDate: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  score?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  maxScore?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  result?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  comment?: string;

}
export class UpdateEntranceExamDto extends PartialType(CreateEntranceExamDto) {}

export class CreateAdmissionDecisionDto {
  @ApiProperty() @IsUUID()
  applicationId: string;

  @ApiProperty() @IsString()
  decision: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  decidedById?: string;

  @ApiProperty() @IsISO8601({ strict: true })
  decidedAt: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  comment?: string;

}
export class UpdateAdmissionDecisionDto extends PartialType(CreateAdmissionDecisionDto) {}
