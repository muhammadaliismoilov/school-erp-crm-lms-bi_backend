import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsPositive, IsString, Length } from 'class-validator';
import { PaymentMethod } from '../enums/contract-status.enum';

export class RecordPaymentDto {
  @ApiProperty({ example: 1000000, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2026-06-07', format: 'date' })
  @IsISO8601({ strict: true })
  paymentDate: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 'PAY-2026-0001', minLength: 1, maxLength: 160 })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  transactionId?: string;

  @ApiPropertyOptional({ example: 'June tuition payment', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;
}
