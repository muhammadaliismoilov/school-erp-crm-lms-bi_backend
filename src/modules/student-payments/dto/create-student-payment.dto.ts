import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { StudentPaymentStatus } from '../entities/student-payment.entity';

export class CreateStudentPaymentDto {
  @ApiProperty({ format: 'uuid', description: 'To‘lov qilayotgan o‘quvchi IDsi.' })
  @IsUUID('4', { message: 'O‘quvchi IDsi UUID bo‘lishi kerak' })
  studentId: string;

  @ApiProperty({ example: 500000, description: 'To‘langan summa.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Summa son bo‘lishi kerak' })
  @Min(0, { message: 'Summa manfiy bo‘lmasligi kerak' })
  amount: number;

  @ApiPropertyOptional({ example: 600000, description: 'Oylik reja (kutilgan to‘lov) summasi.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Reja summasi son bo‘lishi kerak' })
  @Min(0, { message: 'Reja summasi manfiy bo‘lmasligi kerak' })
  planAmount?: number;

  @ApiPropertyOptional({ format: 'uuid', description: 'To‘lov turi IDsi (Naqd, Karta ...).' })
  @IsOptional()
  @IsUUID('4', { message: 'To‘lov turi IDsi UUID bo‘lishi kerak' })
  paymentTypeId?: string;

  @ApiPropertyOptional({ description: 'To‘lov sanasi (YYYY-MM-DD). Bo‘sh bo‘lsa bugun olinadi.', format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: false }, { message: 'To‘lov sanasi YYYY-MM-DD formatida bo‘lishi kerak' })
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'To‘lov tegishli oy (1–12). Bo‘sh bo‘lsa sanadan olinadi.', minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Oy butun son bo‘lishi kerak' })
  @Min(1, { message: 'Oy 1 dan kichik bo‘lmasligi kerak' })
  @Max(12, { message: 'Oy 12 dan oshmasligi kerak' })
  month?: number;

  @ApiPropertyOptional({ description: 'To‘lov tegishli yil. Bo‘sh bo‘lsa sanadan olinadi.', minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Yil butun son bo‘lishi kerak' })
  @Min(2000, { message: 'Yil 2000 dan kichik bo‘lmasligi kerak' })
  @Max(2100, { message: 'Yil 2100 dan oshmasligi kerak' })
  year?: number;

  @ApiPropertyOptional({ description: 'Kvitansiya raqami. Bo‘sh bo‘lsa avtomatik (KV-YYYY-NNNNN) yaratiladi.', maxLength: 40 })
  @IsOptional()
  @IsString({ message: 'Kvitansiya raqami satr bo‘lishi kerak' })
  @Length(1, 40, { message: 'Kvitansiya raqami 1 dan 40 belgigacha bo‘lishi kerak' })
  receiptNumber?: string;

  @ApiPropertyOptional({ description: 'Holat. Bo‘sh bo‘lsa summa va rejaga qarab avtomatik aniqlanadi.', enum: StudentPaymentStatus })
  @IsOptional()
  @IsEnum(StudentPaymentStatus, { message: 'Holat paid/partial/pending bo‘lishi kerak' })
  status?: StudentPaymentStatus;

  @ApiPropertyOptional({ description: 'Izoh.', maxLength: 2000 })
  @IsOptional()
  @IsString({ message: 'Izoh satr bo‘lishi kerak' })
  @Length(0, 2000, { message: 'Izoh 2000 belgidan oshmasligi kerak' })
  note?: string;
}
