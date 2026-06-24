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
} from 'class-validator';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType, example: TransactionType.INCOME, description: 'Kirim yoki chiqim.' })
  @IsEnum(TransactionType, { message: 'Tur income yoki expense bo‘lishi kerak' })
  type: TransactionType;

  @ApiProperty({ example: 500000, description: 'Tranzaksiya miqdori (musbat).', minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Miqdor son bo‘lishi kerak' })
  @Min(0.01, { message: 'Miqdor 0 dan katta bo‘lishi kerak' })
  amount: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'To‘lov maqsadi (kategoriya) IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Kategoriya IDsi UUID bo‘lishi kerak' })
  purposeCategoryId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'To‘lov turi IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'To‘lov turi IDsi UUID bo‘lishi kerak' })
  paymentTypeId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Shaxs (foydalanuvchi) IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Shaxs IDsi UUID bo‘lishi kerak' })
  personId?: string;

  @ApiPropertyOptional({ description: 'Tegishli oy (1–12).', minimum: 1, maximum: 12, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Oy butun son bo‘lishi kerak' })
  @Min(1, { message: 'Oy 1 dan kichik bo‘lmasligi kerak' })
  @Max(12, { message: 'Oy 12 dan oshmasligi kerak' })
  month?: number;

  @ApiPropertyOptional({ description: 'Tegishli yil.', minimum: 2000, maximum: 2100, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Yil butun son bo‘lishi kerak' })
  @Min(2000, { message: 'Yil 2000 dan kichik bo‘lmasligi kerak' })
  @Max(2100, { message: 'Yil 2100 dan oshmasligi kerak' })
  year?: number;

  @ApiPropertyOptional({ description: 'Tranzaksiya sanasi (YYYY-MM-DD). Berilmasa bugun.', format: 'date', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'Sana YYYY-MM-DD formatida bo‘lishi kerak' })
  date?: string;

  @ApiPropertyOptional({ description: 'Izoh (ixtiyoriy).', maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString({ message: 'Izoh matn bo‘lishi kerak' })
  @Length(0, 2000, { message: 'Izoh 2000 belgidan oshmasligi kerak' })
  note?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'To‘lov cheki fayl IDsi.', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Fayl IDsi UUID bo‘lishi kerak' })
  receiptFileId?: string;

  // ─── Boyitilgan o'quvchi-to'lov varianti ────────────────────────────────

  @ApiPropertyOptional({ description: 'Chegirma foizi (0–100).', minimum: 0, maximum: 100, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Chegirma son bo‘lishi kerak' })
  @Min(0, { message: 'Chegirma 0 dan kichik bo‘lmasligi kerak' })
  @Max(100, { message: 'Chegirma 100 dan oshmasligi kerak' })
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Chegirmagacha asl narx.', minimum: 0, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Narx son bo‘lishi kerak' })
  @Min(0, { message: 'Narx manfiy bo‘lmasligi kerak' })
  price?: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'Sinf IDsi (o‘quvchi to‘lovi).', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'Sinf IDsi UUID bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'O‘quvchi IDsi (o‘quvchi to‘lovi).', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'O‘quvchi IDsi UUID bo‘lishi kerak' })
  studentId?: string;
}
