import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuditModule } from '../audit/audit.module';
import { Course } from '../academic/entities/course.entity';
import { LessonPeriod } from '../academic/entities/lesson-period.entity';
import { Quarter } from '../academic/entities/quarter.entity';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Subject } from '../academic/entities/subject.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { User } from '../identity/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { ExamResult } from './entities/exam-result.entity';
import { Exam } from './entities/exam.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { LessonSchedule } from './entities/lesson-schedule.entity';
import { QuarterSubjectGrade } from './entities/quarter-subject-grade.entity';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { GradebookService } from './gradebook.service';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonSchedule,
      JournalEntry,
      Exam,
      ExamResult,
      Student,
      Quarter,
      SchoolClass,
      LessonPeriod,
      Course,
      Subject,
      User,
      AuditLog,
      QuarterSubjectGrade,
    ]),
    AuditModule,
    GamificationModule,
  ],
  controllers: [LmsController, ScheduleController, ExamController],
  providers: [LmsService, ScheduleService, GradebookService, ExamService],
  exports: [LmsService, ScheduleService, GradebookService, ExamService],
})
export class LmsModule {}
