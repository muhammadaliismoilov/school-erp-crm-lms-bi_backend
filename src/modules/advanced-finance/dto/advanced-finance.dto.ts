import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateFinanceInvoiceDto {
  @ApiProperty() @IsString()
  invoiceNo: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  studentId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  contractId?: string;

  @ApiProperty() @IsISO8601({ strict: true })
  issueDate: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true })
  dueDate?: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  amount: number;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  paidAmount: number;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateFinanceInvoiceDto extends PartialType(CreateFinanceInvoiceDto) {}

export class CreateScholarshipDto {
  @ApiProperty() @IsUUID()
  studentId: string;

  @ApiProperty() @IsString()
  name: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  fixedAmount?: number;

  @ApiProperty() @IsISO8601({ strict: true })
  startDate: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true })
  endDate?: string;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateScholarshipDto extends PartialType(CreateScholarshipDto) {}

export class CreateRefundDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  studentId?: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  amount: number;

  @ApiProperty() @IsString()
  reason: string;

  @ApiProperty() @IsString()
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true })
  processedAt?: string;

}
export class UpdateRefundDto extends PartialType(CreateRefundDto) {}

export class CreateCashboxDto {
  @ApiProperty() @IsString()
  name: string;

  @ApiProperty() @IsString()
  code: string;

  @ApiProperty() @IsString()
  currency: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  balance: number;

  @ApiProperty() @IsBoolean()
  isActive: boolean;

}
export class UpdateCashboxDto extends PartialType(CreateCashboxDto) {}

export class CreateBankTransactionDto {
  @ApiProperty() @IsString()
  transactionNo: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  bankName?: string;

  @ApiProperty() @IsISO8601({ strict: true })
  transactionDate: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  amount: number;

  @ApiProperty() @IsString()
  direction: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  matchedPaymentId?: string;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateBankTransactionDto extends PartialType(CreateBankTransactionDto) {}
