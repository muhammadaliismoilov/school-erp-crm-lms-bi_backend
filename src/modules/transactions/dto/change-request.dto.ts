import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  TransactionChangeRequestStatus,
  TransactionChangeRequestType,
} from '../entities/transaction-change-request.entity';
import { TransactionType } from './create-transaction.dto';

/** Tahrirlash so'rovida taklif qilinadigan tranzaksiya qiymatlari (partial). */
export class ProposedTransactionChangesDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType, { message: 'Tur income yoki expense bo‘lishi kerak' })
  type?: TransactionType;

  @ApiPropertyOptional({ example: 500000, minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Miqdor son bo‘lishi kerak' })
  @Min(0.01, { message: 'Miqdor 0 dan katta bo‘lishi kerak' })
  amount?: number;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsISO8601({}, { message: 'Sana ISO formatda bo‘lishi kerak' })
  date?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Kategoriya IDsi UUID bo‘lishi kerak' })
  purposeCategoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'To‘lov turi IDsi UUID bo‘lishi kerak' })
  paymentTypeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Shaxs IDsi UUID bo‘lishi kerak' })
  personId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}

/** Tranzaksiya o'zgartirish so'rovini yaratish. */
export class CreateChangeRequestDto {
  @ApiProperty({ format: 'uuid', description: 'O‘zgartirilayotgan tranzaksiya IDsi.' })
  @IsUUID('4', { message: 'Tranzaksiya IDsi UUID bo‘lishi kerak' })
  transactionId: string;

  @ApiProperty({ enum: TransactionChangeRequestType, description: 'Tahrirlash yoki o‘chirish so‘rovi.' })
  @IsEnum(TransactionChangeRequestType, { message: 'So‘rov turi update yoki delete bo‘lishi kerak' })
  requestType: TransactionChangeRequestType;

  @ApiProperty({ description: 'So‘rov sababi.', example: 'Summa noto‘g‘ri kiritilgan' })
  @IsString()
  @Length(1, 1000, { message: 'So‘rov sababini yozing' })
  reason: string;

  @ApiPropertyOptional({ type: ProposedTransactionChangesDto, description: 'Tahrirlash so‘rovida yangi qiymatlar.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedTransactionChangesDto)
  proposedChanges?: ProposedTransactionChangesDto;
}

/** So'rovni ko'rib chiqish (tasdiqlash / rad etish). */
export class ReviewChangeRequestDto {
  @ApiProperty({ enum: [TransactionChangeRequestStatus.APPROVED, TransactionChangeRequestStatus.REJECTED] })
  @IsEnum(TransactionChangeRequestStatus, { message: 'Holat approved yoki rejected bo‘lishi kerak' })
  status: TransactionChangeRequestStatus;

  @ApiPropertyOptional({ description: 'Ko‘rib chiqish izohi (rad etish sababi yoki tasdiq izohi).', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  reviewNote?: string;
}

/** So'rovlar ro'yxati so'rovi (filtrlar + sahifalash). */
export class ChangeRequestQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sahifa raqami butun son bo‘lishi kerak' })
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit butun son bo‘lishi kerak' })
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Sabab yoki shaxs ismi bo‘yicha qidiruv.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;

  @ApiPropertyOptional({ enum: TransactionChangeRequestStatus, description: 'Holat bo‘yicha filter.' })
  @IsOptional()
  @IsEnum(TransactionChangeRequestStatus, { message: 'Holat ruxsat etilgan qiymatlardan biri bo‘lishi kerak' })
  status?: TransactionChangeRequestStatus;

  @ApiPropertyOptional({ description: 'Boshlanish sanasi (YYYY-MM-DD).' })
  @IsOptional()
  @IsISO8601({}, { message: 'Sana ISO formatda bo‘lishi kerak' })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Tugash sanasi (YYYY-MM-DD).' })
  @IsOptional()
  @IsISO8601({}, { message: 'Sana ISO formatda bo‘lishi kerak' })
  dateTo?: string;
}
