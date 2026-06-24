import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quarter } from '../academic/entities/quarter.entity';
import { Subject } from '../academic/entities/subject.entity';
import { Exam } from '../lms/entities/exam.entity';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { QuarterSubjectGrade } from '../lms/entities/quarter-subject-grade.entity';
import { Student } from '../students/entities/student.entity';
import { ProgressReportsController } from './progress-reports.controller';
import { ProgressReportsService } from './progress-reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, QuarterSubjectGrade, Exam, ExamResult, Subject, Quarter]),
  ],
  controllers: [ProgressReportsController],
  providers: [ProgressReportsService],
  exports: [ProgressReportsService],
})
export class ProgressReportsModule {}
