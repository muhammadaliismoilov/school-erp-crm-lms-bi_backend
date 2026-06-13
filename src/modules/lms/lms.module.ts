import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quarter } from '../academic/entities/quarter.entity';
import { Student } from '../students/entities/student.entity';
import { ExamResult } from './entities/exam-result.entity';
import { Exam } from './entities/exam.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';

@Module({ imports: [TypeOrmModule.forFeature([LessonSchedule, JournalEntry, Exam, ExamResult, Student, Quarter])], controllers: [LmsController], providers: [LmsService], exports: [LmsService] })
export class LmsModule {}
