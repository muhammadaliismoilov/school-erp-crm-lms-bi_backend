import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quarter } from '../academic/entities/quarter.entity';
import { Subject } from '../academic/entities/subject.entity';
import { AuditModule } from '../audit/audit.module';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { JournalEntry } from '../lms/entities/journal-entry.entity';
import { QuarterSubjectGrade } from '../lms/entities/quarter-subject-grade.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Student } from '../students/entities/student.entity';
import { GradeChangeRequest } from './entities/grade-change-request.entity';
import { GradeRequestsController } from './grade-requests.controller';
import { GradeRequestsService } from './grade-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GradeChangeRequest,
      Student,
      Subject,
      Quarter,
      JournalEntry,
      QuarterSubjectGrade,
      ExamResult,
    ]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [GradeRequestsController],
  providers: [GradeRequestsService],
  exports: [GradeRequestsService],
})
export class GradeRequestsModule {}
