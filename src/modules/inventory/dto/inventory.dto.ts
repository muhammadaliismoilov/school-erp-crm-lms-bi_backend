import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
import { InventoryItemStatus, InventoryTransactionType } from '../enums/inventory.enums';

export class CreateInventoryCategoryDto { @ApiProperty() @IsString() @Length(2, 80) name: string; @ApiProperty() @IsString() @Length(2, 40) code: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; }
export class UpdateInventoryCategoryDto extends PartialType(CreateInventoryCategoryDto) {}
export class CreateInventoryItemDto {
  @ApiProperty() @IsString() @Length(2, 60) assetCode: string;
  @ApiProperty() @IsString() @Length(2, 120) name: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() roomId?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601({ strict: true }) purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) purchasePrice?: number;
  @ApiPropertyOptional({ enum: InventoryItemStatus }) @IsOptional() @IsEnum(InventoryItemStatus) status?: InventoryItemStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {}
export class CreateInventoryTransactionDto { @ApiProperty({ format: 'uuid' }) @IsUUID() itemId: string; @ApiProperty({ enum: InventoryTransactionType }) @IsEnum(InventoryTransactionType) type: InventoryTransactionType; @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number; @ApiPropertyOptional() @IsOptional() @IsString() comment?: string; }
