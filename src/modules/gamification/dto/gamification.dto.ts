import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsHexColor, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { WalletTransactionType } from '../enums/gamification.enums';

export class CreateCoinPresetDto { @ApiProperty() @IsString() @Length(1, 120) name: string; @ApiProperty({ minimum: 1, maximum: 1000000 }) @Type(() => Number) @IsInt() @Min(1) @Max(1000000) amount: number; @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 64) icon?: string; @ApiPropertyOptional() @IsOptional() @IsHexColor() color?: string; @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number; @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean; }
export class UpdateCoinPresetDto extends PartialType(CreateCoinPresetDto) {}
export class CreateBadgeDto { @ApiProperty() @IsString() @Length(2, 120) title: string; @ApiPropertyOptional() @IsOptional() @IsString() description?: string; @ApiPropertyOptional() @IsOptional() @IsString() iconUrl?: string; @ApiPropertyOptional() @IsOptional() @IsObject() rules?: Record<string, unknown>; }
export class UpdateBadgeDto extends PartialType(CreateBadgeDto) {}
export class AwardBadgeDto { @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string; @ApiProperty({ format: 'uuid' }) @IsUUID() badgeId: string; @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() awardedBy?: string; @ApiPropertyOptional() @IsOptional() @IsString() awardedReason?: string; }
export class AddCoinTransactionDto { @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string; @ApiProperty({ enum: WalletTransactionType }) @IsEnum(WalletTransactionType) type: WalletTransactionType; @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(100000) amount: number; @ApiProperty() @IsString() @Length(2, 180) reason: string; @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string; @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() sourceId?: string; }
