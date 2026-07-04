import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { QualificationCategory } from '../enums/hr.enums';

/** Stavka jadvali yozuvi — toifa uchun dars stavkasi (amal qilish sanasi bilan). */
export class CreatePayRateCardDto {
  @ApiProperty({ enum: QualificationCategory, example: QualificationCategory.OLIY })
  @IsEnum(QualificationCategory)
  category: QualificationCategory;

  @ApiProperty({ example: 60000, description: 'Bitta dars (akademik soat) stavkasi, so‘mda.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ratePerLesson: number;

  @ApiProperty({ example: '2026-09-01', description: 'Shu sanadan boshlab amal qiladi.' })
  @IsISO8601()
  effectiveFrom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}

export class UpdatePayRateCardDto extends PartialType(CreatePayRateCardDto) {}

export class PayRateCardQueryDto {
  @ApiPropertyOptional({ enum: QualificationCategory })
  @IsOptional()
  @IsEnum(QualificationCategory)
  category?: QualificationCategory;
}

/** Oylik siyosati sozlamalari (filial darajasida bitta yozuv). */
export class UpdatePayrollSettingsDto {
  @ApiPropertyOptional({ example: 600000, description: 'Bitta sinf rahbarligi uchun oylik qo‘shimcha.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  classLeaderRate?: number;

  @ApiPropertyOptional({ example: 3, description: 'Bir o‘qituvchiga maksimal sinf rahbarliklari soni.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxClassLeaderships?: number;
}
