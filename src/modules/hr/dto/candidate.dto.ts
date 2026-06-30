import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { CandidateStage } from '../enums/hr.enums';

export class CreateCandidateDto {
  @ApiProperty({ example: 'Aziz' }) @IsString() @Length(1, 80) firstName: string;
  @ApiProperty({ example: 'Karimov' }) @IsString() @Length(1, 80) lastName: string;
  @ApiProperty({ example: 'aziz@example.com' }) @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 20) phone?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() vacancyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() recruiterId?: string;
  @ApiPropertyOptional({ enum: CandidateStage, default: CandidateStage.NEW })
  @IsOptional() @IsEnum(CandidateStage) stage?: CandidateStage;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 120) stageStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) notes?: string;
}

export class UpdateCandidateDto extends PartialType(CreateCandidateDto) {}

export class UpdateCandidateStageDto {
  @ApiProperty({ enum: CandidateStage }) @IsEnum(CandidateStage) stage: CandidateStage;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 120) stageStatus?: string;
}

export class CandidateQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) search?: string;
  @ApiPropertyOptional({ enum: CandidateStage }) @IsOptional() @IsEnum(CandidateStage) stage?: CandidateStage;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() vacancyId?: string;
}
