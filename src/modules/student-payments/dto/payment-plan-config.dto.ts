import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const PLAN_CODES = ['yearly_1x', 'split_2', 'split_3', 'monthly'] as const;
type PlanCode = (typeof PLAN_CODES)[number];

export class PlanRateDto {
  @ApiProperty({ enum: PLAN_CODES })
  @IsIn(PLAN_CODES)
  planCode: PlanCode;

  @ApiProperty({ enum: ['percent', 'amount'] })
  @IsIn(['percent', 'amount'])
  discountType: 'percent' | 'amount';

  @ApiProperty({ example: 2000000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue: number;
}

export class UpdatePaymentPlanConfigDto {
  @ApiProperty({ example: 1000000, description: 'Invariant validatsiyasi uchun etalon oylik tarif.', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  referenceMonthlyFee: number;

  @ApiProperty({ example: 10, description: 'Akademik yil yo‘q bo‘lsa fallback oylar soni.', minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  fallbackMonths: number;

  @ApiProperty({ type: [PlanRateDto] })
  @ValidateNested({ each: true })
  @Type(() => PlanRateDto)
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  rates: PlanRateDto[];
}

export class PlanPreviewQueryDto {
  @ApiProperty({ example: 1000000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyFee: number;

  @ApiPropertyOptional({ enum: ['percent', 'amount'], description: 'Individual chegirma turi.' })
  @IsOptional()
  @IsIn(['percent', 'amount'])
  discountType?: 'percent' | 'amount';

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ example: '2025-11-01', description: 'Billing boshlanish sanasi (yil o‘rtasi keluvchi uchun).' })
  @IsOptional()
  @IsString()
  billingStart?: string;

  // --- Gibrid: o'quvchiga maxsus reja chegirmasi (override) jonli preview uchun ---
  @ApiPropertyOptional({ enum: PLAN_CODES, description: 'Override qo‘llanadigan reja (qolgan rejalar global config‘dan).' })
  @IsOptional()
  @IsIn(PLAN_CODES)
  overridePlan?: PlanCode;

  @ApiPropertyOptional({ enum: ['percent', 'amount'], description: 'Reja override chegirma turi.' })
  @IsOptional()
  @IsIn(['percent', 'amount'])
  overrideType?: 'percent' | 'amount';

  @ApiPropertyOptional({ example: 10, minimum: 0, description: 'Reja override chegirma qiymati (foiz yoki so‘m).' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overrideValue?: number;
}
