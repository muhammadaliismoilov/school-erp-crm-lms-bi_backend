import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Matches, Max, Min } from 'class-validator';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateLessonPeriodDto {
  @ApiProperty({
    description: 'Lesson sequence number shown in the UI as "1-Dars", "2-Dars", etc.',
    example: 1,
    minimum: 1,
    maximum: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  lessonNumber: number;

  @ApiProperty({
    description: 'Lesson start time in 24-hour HH:mm format.',
    example: '08:00',
    pattern: 'HH:mm',
  })
  @Matches(timePattern)
  startTime: string;

  @ApiProperty({
    description: 'Lesson end time in 24-hour HH:mm format.',
    example: '08:45',
    pattern: 'HH:mm',
  })
  @Matches(timePattern)
  endTime: string;
}
