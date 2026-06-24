import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../academic/entities/academic-year.entity';
import { Quarter } from '../academic/entities/quarter.entity';
import { Subject } from '../academic/entities/subject.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { JournalEntry } from '../lms/entities/journal-entry.entity';
import { QuarterSubjectGrade } from '../lms/entities/quarter-subject-grade.entity';
import { Student } from '../students/entities/student.entity';
import { StudentsRatingController } from './students-rating.controller';
import { StudentsRatingService } from './students-rating.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      AcademicYear,
      Quarter,
      Subject,
      QuarterSubjectGrade,
      JournalEntry,
      ExamResult,
      AttendanceRecord,
    ]),
  ],
  controllers: [StudentsRatingController],
  providers: [StudentsRatingService],
  exports: [StudentsRatingService],
})
export class StudentsRatingModule {}
