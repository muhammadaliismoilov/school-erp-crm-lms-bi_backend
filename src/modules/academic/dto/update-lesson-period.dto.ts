import { PartialType } from '@nestjs/swagger';
import { CreateLessonPeriodDto } from './create-lesson-period.dto';

export class UpdateLessonPeriodDto extends PartialType(CreateLessonPeriodDto) {}
