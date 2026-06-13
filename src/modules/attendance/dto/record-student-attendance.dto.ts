import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Matches, Length } from 'class-validator';
import { AttendanceStatus } from '../../../common/enums/attendance-status.enum';

export class RecordStudentAttendanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: '2026-06-07', format: 'date' })
  @IsISO8601({ strict: true })
  date: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: '08:30', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  checkInTime?: string;

  @ApiPropertyOptional({ example: '15:30', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  checkOutTime?: string;

  @ApiPropertyOptional({ example: 'Medical appointment', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  reason?: string;
}
