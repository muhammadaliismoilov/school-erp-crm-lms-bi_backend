import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Matches, Max, Min, ValidateIf } from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class UpdateAttendanceSettingsDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 120, description: 'Kechikish chegarasi (daqiqa).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  lateThresholdMinutes?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10080, description: 'Tuzatish oynasi (daqiqa). 0 = faqat admin.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  correctionWindowMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnEntry?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnExit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnSession?: boolean;

  @ApiPropertyOptional({ example: '21:00', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Matches(TIME_RE)
  quietHoursStart?: string | null;

  @ApiPropertyOptional({ example: '07:00', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Matches(TIME_RE)
  quietHoursEnd?: string | null;
}
