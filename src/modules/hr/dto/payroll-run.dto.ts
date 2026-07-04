import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { PayrollStatus } from '../enums/hr.enums';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export class GeneratePayrollRunDto {
  @ApiProperty({ example: '2026-07', description: 'Hisoblanadigan oy (YYYY-MM).' })
  @Matches(PERIOD_RE, { message: 'period YYYY-MM formatida bo‘lishi kerak' })
  period: string;
}

export class PayrollRunQueryDto {
  @ApiPropertyOptional({ example: '2026-07' })
  @IsOptional()
  @Matches(PERIOD_RE, { message: 'period YYYY-MM formatida bo‘lishi kerak' })
  period?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staffMemberId?: string;

  @ApiPropertyOptional({ enum: PayrollStatus })
  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;
}
