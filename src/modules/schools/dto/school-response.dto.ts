import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { PaymentPeriodUnit, PaymentStartStrategy, SchoolType, WorkDays } from '../enums/school.enums';
import { GroupMonthlyPaymentDto } from './group-monthly-payment.dto';

export class SchoolCapacitiesDto {
  @ApiProperty({ example: 400 })
  total: number;

  @ApiProperty({ example: 140 })
  elementary: number;

  @ApiProperty({ example: 260 })
  upper: number;
}

export class SchoolPaymentDto {
  @ApiProperty({ example: 1200000 })
  monthlyPayment: number;

  @ApiProperty({ enum: PaymentStartStrategy, example: PaymentStartStrategy.FULL_ACADEMIC_YEAR })
  paymentStartStrategy: PaymentStartStrategy;

  @ApiProperty({ enum: PaymentPeriodUnit, example: PaymentPeriodUnit.YEAR })
  paymentPeriodUnit: PaymentPeriodUnit;

  @ApiProperty({ enum: WorkDays, example: WorkDays.FIVE_DAYS })
  workDays: WorkDays;

  @ApiProperty({ example: false })
  separateGroupPayments: boolean;

  @ApiProperty({ type: [GroupMonthlyPaymentDto] })
  groupMonthlyPayments: GroupMonthlyPaymentDto[];
}

export class SchoolResponseDto {
  @ApiProperty({ example: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Toshkent Intellekt Maktabi' })
  name: string;

  @ApiPropertyOptional({ example: 'Toshkent Intellekt Xususiy Maktabi MCHJ', nullable: true })
  legalName?: string | null;

  @ApiProperty({ enum: SchoolType, example: SchoolType.PRIVATE })
  schoolType: SchoolType;

  @ApiProperty({ example: 'UZ' })
  country: string;

  @ApiPropertyOptional({ example: 'Toshkent shahri', nullable: true })
  region?: string | null;

  @ApiPropertyOptional({ example: 'Yunusobod tumani', nullable: true })
  district?: string | null;

  @ApiPropertyOptional({ example: 'Yunusobod tumani, 4-mavze, 15-uy', nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ example: 'https://intellekt.example.uz', nullable: true })
  websiteUrl?: string | null;

  @ApiPropertyOptional({ example: 'info@example.uz', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: '+998712345678', nullable: true })
  phone?: string | null;

  @ApiProperty({ type: SchoolCapacitiesDto })
  capacities: SchoolCapacitiesDto;

  @ApiProperty({ type: SchoolPaymentDto })
  payment: SchoolPaymentDto;

  @ApiPropertyOptional({ example: 'https://cdn.example.uz/logo.png', nullable: true })
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: '8cf35a94-92b4-4f1a-8a7a-90a78003892d', format: 'uuid', nullable: true })
  logoFileId?: string | null;

  @ApiProperty({ enum: CommonStatus, example: CommonStatus.ACTIVE })
  status: CommonStatus;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  version?: number;
}

export class SchoolStatsDto {
  @ApiProperty({ example: 5 })
  schoolCount: number;

  @ApiProperty({ example: 2100 })
  totalCapacity: number;

  @ApiProperty({ example: 0 })
  monthlyPaymentTotal: number;
}

export class SchoolListResponseDto {
  @ApiProperty({ type: SchoolStatsDto })
  stats: SchoolStatsDto;

  @ApiProperty({ type: [SchoolResponseDto] })
  items: SchoolResponseDto[];

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class SchoolResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: SchoolResponseDto })
  data: SchoolResponseDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}

export class SchoolListResponseEnvelopeDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: SchoolListResponseDto })
  data: SchoolListResponseDto;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
