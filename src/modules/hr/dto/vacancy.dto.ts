import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { VacancyStatus } from '../enums/hr.enums';

export class CreateVacancyDto {
  @ApiProperty({ example: 'Matematika o‘qituvchisi' }) @IsString() @Length(1, 200) title: string;
  @ApiPropertyOptional({ enum: VacancyStatus, default: VacancyStatus.OPEN })
  @IsOptional() @IsEnum(VacancyStatus) status?: VacancyStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() positionId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() recruiterId?: string;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSalary?: number;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxSalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) responsibilities?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) requirements?: string;
}

export class UpdateVacancyDto extends PartialType(CreateVacancyDto) {}

export class VacancyQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) search?: string;
  @ApiPropertyOptional({ enum: VacancyStatus }) @IsOptional() @IsEnum(VacancyStatus) status?: VacancyStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() departmentId?: string;
}
