import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty() @IsString()
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  taxNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  address?: string;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateVendorDto extends PartialType(CreateVendorDto) {}

export class CreatePurchaseRequestDto {
  @ApiProperty() @IsString()
  requestNo: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  requestedById?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  departmentId?: string;

  @ApiProperty() @IsString()
  purpose: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  estimatedAmount: number;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdatePurchaseRequestDto extends PartialType(CreatePurchaseRequestDto) {}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsString()
  orderNo: string;

  @ApiProperty() @IsUUID()
  vendorId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  requestId?: string;

  @ApiProperty() @IsISO8601({ strict: true })
  orderDate: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  totalAmount: number;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

export class CreateGoodsReceiptDto {
  @ApiProperty() @IsString()
  receiptNo: string;

  @ApiProperty() @IsUUID()
  purchaseOrderId: string;

  @ApiProperty() @IsISO8601({ strict: true })
  receivedAt: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  receivedById?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateGoodsReceiptDto extends PartialType(CreateGoodsReceiptDto) {}
