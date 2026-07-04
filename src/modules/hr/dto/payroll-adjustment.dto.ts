import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Matches } from 'class-validator';
import { PayrollAdjustmentType } from '../enums/hr.enums';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export class CreatePayrollAdjustmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  staffMemberId: string;

  @ApiProperty({ example: '2026-07', description: 'Qaysi oyga tegishli (YYYY-MM).' })
  @Matches(PERIOD_RE, { message: 'period YYYY-MM formatida bo‘lishi kerak' })
  period: string;

  @ApiProperty({ enum: PayrollAdjustmentType })
  @IsEnum(PayrollAdjustmentType)
  type: PayrollAdjustmentType;

  @ApiProperty({ example: 500000, description: 'Musbat summa (jarima dvigatelda manfiy bo‘ladi).' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Sabab — majburiy.' })
  @IsString()
  @Length(3, 1000)
  reason: string;
}

/** Tegishli oylik hali Qoralama bo'lsagina tahrirlanadi. */
export class UpdatePayrollAdjustmentDto {
  @ApiPropertyOptional({ example: 300000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 1000)
  reason?: string;
}

export class PayrollAdjustmentQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staffMemberId?: string;

  @ApiPropertyOptional({ example: '2026-07' })
  @IsOptional()
  @Matches(PERIOD_RE, { message: 'period YYYY-MM formatida bo‘lishi kerak' })
  period?: string;

  @ApiPropertyOptional({ enum: PayrollAdjustmentType })
  @IsOptional()
  @IsEnum(PayrollAdjustmentType)
  type?: PayrollAdjustmentType;
}
