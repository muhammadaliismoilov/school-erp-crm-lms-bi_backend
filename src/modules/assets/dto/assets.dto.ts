import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateFixedAssetDto {
  @ApiProperty() @IsString()
  assetCode: string;

  @ApiProperty() @IsString()
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true })
  purchaseDate?: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  purchaseCost: number;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  currentValue: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  responsibleStaffId?: string;

  @ApiProperty() @IsString()
  status: string;

}
export class UpdateFixedAssetDto extends PartialType(CreateFixedAssetDto) {}

export class CreateAssetMaintenanceTicketDto {
  @ApiProperty() @IsUUID()
  assetId: string;

  @ApiProperty() @IsString()
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiProperty() @IsString()
  priority: string;

  @ApiProperty() @IsString()
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true })
  dueDate?: string;

}
export class UpdateAssetMaintenanceTicketDto extends PartialType(CreateAssetMaintenanceTicketDto) {}

export class CreateAssetDepreciationDto {
  @ApiProperty() @IsUUID()
  assetId: string;

  @ApiProperty() @IsString()
  period: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  amount: number;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  bookValue: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;

}
export class UpdateAssetDepreciationDto extends PartialType(CreateAssetDepreciationDto) {}
