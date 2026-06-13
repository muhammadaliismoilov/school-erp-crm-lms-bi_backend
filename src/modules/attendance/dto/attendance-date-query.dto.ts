import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class AttendanceDateQueryDto {
  @ApiProperty({ example: '2026-06-07', format: 'date' })
  @IsISO8601({ strict: true })
  date: string;
}
