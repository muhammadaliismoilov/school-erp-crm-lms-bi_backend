import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { AttendanceAction, AttendanceReviewStatus } from '../enums/hr.enums';

export class CreateAttendanceDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() staffMemberId: string;
  @ApiProperty({ enum: AttendanceAction }) @IsEnum(AttendanceAction) action: AttendanceAction;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601() recordedAt?: string;
  @ApiPropertyOptional({ example: 41.311081 })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 7 }) @Min(-90) @Max(90) latitude?: number;
  @ApiPropertyOptional({ example: 69.240562 })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 7 }) @Min(-180) @Max(180) longitude?: number;
  @ApiPropertyOptional({ format: 'uuid', description: 'Geofence (lokatsiya) IDsi.' })
  @IsOptional() @IsUUID() geofenceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 1000) deviceInfo?: string;
  @ApiPropertyOptional({ enum: AttendanceReviewStatus }) @IsOptional() @IsEnum(AttendanceReviewStatus) status?: AttendanceReviewStatus;
}
export class UpdateAttendanceDto extends PartialType(CreateAttendanceDto) {}

export class AttendanceQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Sahifa hajmi (10/20/50/100).' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;

  @ApiPropertyOptional({ description: 'Xodim ismi bo‘yicha qidiruv.' })
  @IsOptional() @IsString() @Length(1, 120) search?: string;

  @ApiPropertyOptional({ enum: AttendanceReviewStatus }) @IsOptional() @IsEnum(AttendanceReviewStatus) status?: AttendanceReviewStatus;
  @ApiPropertyOptional({ enum: AttendanceAction }) @IsOptional() @IsEnum(AttendanceAction) action?: AttendanceAction;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() staffMemberId?: string;
}

export class ReviewAttendanceDto {
  @ApiProperty({ enum: [AttendanceReviewStatus.APPROVED, AttendanceReviewStatus.REJECTED] })
  @IsEnum(AttendanceReviewStatus) status: AttendanceReviewStatus;
}

/** Geofence yaratish (minimal — Lakatsiya feature'i kengaytiradi). */
export class CreateGeofenceDto {
  @ApiProperty({ example: 'Bosh ofis' }) @IsString() @Length(1, 160) name: string;
}
