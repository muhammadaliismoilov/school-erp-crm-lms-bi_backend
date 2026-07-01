import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../identity/entities/role.entity';
import { User } from '../identity/entities/user.entity';
import { Branch } from '../settings/entities/branch.entity';
import { School } from '../settings/entities/school.entity';
import { UsersModule } from '../users/users.module';
import { Department } from './entities/department.entity';
import { DepartmentService } from './department.service';
import { BranchService } from './branch.service';
import { PositionService } from './position.service';
import { LeaveService } from './leave.service';
import { TaskService } from './task.service';
import { AttendanceHrService } from './attendance-hr.service';
import { Payroll } from './entities/payroll.entity';
import { Position } from './entities/position.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffMember } from './entities/staff-member.entity';
import { StaffSalaryHistory } from './entities/staff-salary-history.entity';
import { StaffCertificate } from './entities/staff-certificate.entity';
import { StaffAchievement } from './entities/staff-achievement.entity';
import { Project } from './entities/project.entity';
import { Task } from './entities/task.entity';
import { Geofence } from './entities/geofence.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Teacher } from './entities/teacher.entity';
import { Vacancy } from './entities/vacancy.entity';
import { Candidate } from './entities/candidate.entity';
import { Interaction } from './entities/interaction.entity';
import { Survey } from './entities/survey.entity';
import { PerformanceReview } from './entities/performance-review.entity';
import { WorkSchedule } from './entities/work-schedule.entity';
import { WorkScheduleDay } from './entities/work-schedule-day.entity';
import { Timesheet } from './entities/timesheet.entity';
import { TimesheetLine } from './entities/timesheet-line.entity';
import { HrPayment } from './entities/hr-payment.entity';
import { HrController } from './hr.controller';
import { TeacherController } from './teacher.controller';
import { VacancyController } from './vacancy.controller';
import { CandidateController } from './candidate.controller';
import { InteractionController } from './interaction.controller';
import { SurveyController } from './survey.controller';
import { PerformanceReviewController } from './performance-review.controller';
import { WorkScheduleController } from './work-schedule.controller';
import { TimesheetController } from './timesheet.controller';
import { HrPaymentController } from './hr-payment.controller';
import { ProjectController } from './project.controller';
import { GeofenceController } from './geofence.controller';
import { HrStatsController } from './hr-stats.controller';
import { HrService } from './hr.service';
import { StaffService } from './staff.service';
import { StaffPortfolioService } from './staff-portfolio.service';
import { TeacherService } from './teacher.service';
import { VacancyService } from './vacancy.service';
import { CandidateService } from './candidate.service';
import { InteractionService } from './interaction.service';
import { SurveyService } from './survey.service';
import { PerformanceReviewService } from './performance-review.service';
import { WorkScheduleService } from './work-schedule.service';
import { TimesheetService } from './timesheet.service';
import { HrPaymentService } from './hr-payment.service';
import { ProjectService } from './project.service';
import { GeofenceService } from './geofence.service';
import { HrStatsService } from './hr-stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      Position,
      StaffMember,
      StaffLeave,
      Payroll,
      StaffSalaryHistory,
      StaffCertificate,
      StaffAchievement,
      User,
      Role,
      Branch,
      School,
      Project,
      Task,
      Geofence,
      AttendanceRecord,
      Teacher,
      Vacancy,
      Candidate,
      Interaction,
      Survey,
      PerformanceReview,
      WorkSchedule,
      WorkScheduleDay,
      Timesheet,
      TimesheetLine,
      HrPayment,
    ]),
    UsersModule,
  ],
  controllers: [HrController, TeacherController, VacancyController, CandidateController, InteractionController, SurveyController, PerformanceReviewController, WorkScheduleController, TimesheetController, HrPaymentController, ProjectController, GeofenceController, HrStatsController],
  providers: [HrService, StaffService, StaffPortfolioService, DepartmentService, BranchService, PositionService, LeaveService, TaskService, AttendanceHrService, TeacherService, VacancyService, CandidateService, InteractionService, SurveyService, PerformanceReviewService, WorkScheduleService, TimesheetService, HrPaymentService, ProjectService, GeofenceService, HrStatsService],
  exports: [HrService, StaffService, StaffPortfolioService, DepartmentService, BranchService, PositionService, LeaveService, TaskService, AttendanceHrService, TeacherService, VacancyService, CandidateService, InteractionService, SurveyService, PerformanceReviewService, WorkScheduleService, TimesheetService, HrPaymentService, ProjectService, GeofenceService],
})
export class HrModule {}
