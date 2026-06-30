import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { HrPaymentStatus } from '../enums/hr.enums';

export class CreateHrPaymentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() staffMemberId: string;
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional({ example: '2026-06-30' }) @IsOptional() @IsISO8601() paymentDate?: string;
  @ApiPropertyOptional({ enum: HrPaymentStatus, default: HrPaymentStatus.PENDING })
  @IsOptional() @IsEnum(HrPaymentStatus) status?: HrPaymentStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() timesheetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 1000) note?: string;
}

export class UpdateHrPaymentDto extends PartialType(CreateHrPaymentDto) {}

export class UpdateHrPaymentStatusDto {
  @ApiProperty({ enum: HrPaymentStatus }) @IsEnum(HrPaymentStatus) status: HrPaymentStatus;
}

export class HrPaymentQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) search?: string;
  @ApiPropertyOptional({ enum: HrPaymentStatus }) @IsOptional() @IsEnum(HrPaymentStatus) status?: HrPaymentStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() staffMemberId?: string;
}
