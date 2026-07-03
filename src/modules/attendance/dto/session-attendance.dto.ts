import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from '../../../common/enums/attendance-status.enum';

export class SessionListQueryDto {
  @ApiProperty({ example: '2026-07-03', format: 'date' })
  @IsISO8601({ strict: true })
  date: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'O‘qituvchi bo‘yicha filtr.' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}

export class OpenSessionDto {
  @ApiProperty({ format: 'uuid', description: 'Jadval sloti (dars/kurs).' })
  @IsUUID()
  slotId: string;

  @ApiProperty({ example: '2026-07-03', format: 'date' })
  @IsISO8601({ strict: true })
  date: string;
}

/** Bitta o'quvchi bo'yicha o'qituvchi kiritgan/tuzatgan davomat. */
export class SessionAttendanceEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ minimum: 0, maximum: 600, description: 'Kechikish daqiqasi (LATE uchun).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  minutesLate?: number;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  note?: string;
}

export class ConfirmSessionDto {
  @ApiPropertyOptional({
    type: [SessionAttendanceEntryDto],
    description: 'Faqat o‘zgargan/tuzatilgan yozuvlar (qolganlari avtomatik holatida qoladi).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SessionAttendanceEntryDto)
  entries?: SessionAttendanceEntryDto[];
}

export class UpdateAttendanceEntryDto {
  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ minimum: 0, maximum: 600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  minutesLate?: number;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  note?: string;

  @ApiPropertyOptional({ maxLength: 255, description: 'Tuzatish sababi (auditga yoziladi).' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  reason?: string;
}
