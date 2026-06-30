import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { InteractionStatus, InteractionType } from '../enums/hr.enums';

export class CreateInteractionDto {
  @ApiProperty({ example: 'Birinchi suhbat' }) @IsString() @Length(1, 200) title: string;
  @ApiPropertyOptional({ enum: InteractionType, default: InteractionType.CALL })
  @IsOptional() @IsEnum(InteractionType) type?: InteractionType;
  @ApiPropertyOptional({ enum: InteractionStatus, default: InteractionStatus.PLANNED })
  @IsOptional() @IsEnum(InteractionStatus) status?: InteractionStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() candidateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 200) location?: string;
  @ApiPropertyOptional({ description: 'Boshlanish vaqti (ISO).' }) @IsOptional() @IsISO8601() scheduledAt?: string;
  @ApiPropertyOptional({ description: 'Tugash vaqti (ISO).' }) @IsOptional() @IsISO8601() endAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) purpose?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) result?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) nextSteps?: string;
}

export class UpdateInteractionDto extends PartialType(CreateInteractionDto) {}

export class InteractionQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) search?: string;
  @ApiPropertyOptional({ enum: InteractionType }) @IsOptional() @IsEnum(InteractionType) type?: InteractionType;
  @ApiPropertyOptional({ enum: InteractionStatus }) @IsOptional() @IsEnum(InteractionStatus) status?: InteractionStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() candidateId?: string;
}
