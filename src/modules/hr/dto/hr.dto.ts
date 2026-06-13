import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsISO8601, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { EmploymentStatus, LeaveStatus, PayrollStatus } from '../enums/hr.enums';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Academic' }) @IsString() @Length(2, 80) name: string;
  @ApiProperty({ example: 'academic' }) @IsString() @Length(2, 40) code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

export class CreatePositionDto {
  @ApiProperty({ example: 'Math teacher' }) @IsString() @Length(2, 80) title: string;
  @ApiProperty({ example: 'math_teacher' }) @IsString() @Length(2, 40) code: string;
  @ApiPropertyOptional({ example: 5000000 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) baseSalary?: number;
}
export class UpdatePositionDto extends PartialType(CreatePositionDto) {}

export class CreateStaffMemberDto {
  @ApiProperty({ example: 'EMP-001' }) @IsString() @Length(2, 40) employeeCode: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() userId?: string;
  @ApiProperty({ example: 'Ali' }) @IsString() @Length(2, 80) firstName: string;
  @ApiProperty({ example: 'Valiyev' }) @IsString() @Length(2, 80) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(5, 20) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() positionId?: string;
  @ApiProperty({ example: '2026-09-01', format: 'date' }) @IsISO8601({ strict: true }) hireDate: string;
  @ApiPropertyOptional({ enum: EmploymentStatus }) @IsOptional() @IsEnum(EmploymentStatus) status?: EmploymentStatus;
  @ApiPropertyOptional({ example: 5000000 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) salary?: number;
}
export class UpdateStaffMemberDto extends PartialType(CreateStaffMemberDto) {}

export class CreateLeaveDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() staffMemberId: string;
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: true }) startDate: string;
  @ApiProperty({ format: 'date' }) @IsISO8601({ strict: true }) endDate: string;
  @ApiProperty() @IsString() @Length(3, 120) reason: string;
  @ApiPropertyOptional({ enum: LeaveStatus }) @IsOptional() @IsEnum(LeaveStatus) status?: LeaveStatus;
}
export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {}

export class CreatePayrollDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() staffMemberId: string;
  @ApiProperty({ example: '2026-06' }) @Matches(/^\d{4}-\d{2}$/) period: string;
  @ApiProperty({ example: 5000000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() baseAmount: number;
  @ApiPropertyOptional({ example: 500000 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) bonus?: number;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) deduction?: number;
  @ApiPropertyOptional({ enum: PayrollStatus }) @IsOptional() @IsEnum(PayrollStatus) status?: PayrollStatus;
}
export class UpdatePayrollDto extends PartialType(CreatePayrollDto) {}
