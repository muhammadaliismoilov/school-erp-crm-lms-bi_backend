import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { GamificationModule } from '../gamification/gamification.module';
import { LmsModule } from '../lms/lms.module';
import { AcademicYear } from '../academic/entities/academic-year.entity';
import { Quarter } from '../academic/entities/quarter.entity';
import { LessonPeriod } from '../academic/entities/lesson-period.entity';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { JournalEntry } from '../lms/entities/journal-entry.entity';
import { LessonSchedule } from '../lms/entities/lesson-schedule.entity';
import { QuarterSubjectGrade } from '../lms/entities/quarter-subject-grade.entity';
import { Payment } from '../finance/entities/payment.entity';
import { User } from '../identity/entities/user.entity';
import { Parent } from './entities/parent.entity';
import { StudentAchievement } from './entities/student-achievement.entity';
import { StudentAdmission } from './entities/student-admission.entity';
import { StudentConclusion } from './entities/student-conclusion.entity';
import { StudentDocument } from './entities/student-document.entity';
import { StudentParent } from './entities/student-parent.entity';
import { StudentSmartGoal } from './entities/student-smart-goal.entity';
import { Student } from './entities/student.entity';
import { StudentAchievementController } from './student-achievement.controller';
import { StudentAchievementService } from './student-achievement.service';
import { StudentProfileController } from './student-profile.controller';
import { StudentProfileService } from './student-profile.service';
import { StudentReportController } from './student-report.controller';
import { StudentReportService } from './student-report.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [
    AuditModule,
    LmsModule,
    GamificationModule,
    TypeOrmModule.forFeature([
      Student,
      Parent,
      StudentParent,
      StudentDocument,
      StudentAdmission,
      StudentAchievement,
      StudentConclusion,
      StudentSmartGoal,
      // Boshqa modullardan o‘qish uchun (aggregatsiya)
      AcademicYear,
      Quarter,
      LessonPeriod,
      QuarterSubjectGrade,
      JournalEntry,
      LessonSchedule,
      ExamResult,
      Payment,
      User,
    ]),
  ],
  controllers: [
    StudentsController,
    StudentProfileController,
    StudentAchievementController,
    StudentReportController,
  ],
  providers: [
    StudentsService,
    StudentProfileService,
    StudentAchievementService,
    StudentReportService,
  ],
  exports: [StudentsService],
})
export class StudentsModule {}
