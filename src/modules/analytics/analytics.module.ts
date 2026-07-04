import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../finance/entities/contract.entity';
import { Payment } from '../finance/entities/payment.entity';
import { StaffMember } from '../hr/entities/staff-member.entity';
import { User } from '../identity/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { ClassSession } from '../attendance/entities/class-session.entity';
import { Lead } from '../crm/entities/lead.entity';
import { Payroll } from '../hr/entities/payroll.entity';
import { StaffCertificate } from '../hr/entities/staff-certificate.entity';
import { StudentPayment } from '../student-payments/entities/student-payment.entity';
import { StudentPaymentsModule } from '../student-payments/student-payments.module';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Branch } from '../settings/entities/branch.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DashboardOverviewService } from './dashboard-overview.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      User,
      Contract,
      Payment,
      StaffMember,
      AttendanceRecord,
      ClassSession,
      Lead,
      Payroll,
      StaffCertificate,
      StudentPayment,
      Branch,
      AuditLog,
    ]),
    // Qarzdorlik KPI'si uchun tayyor DebtsService (student-payments eksporti).
    StudentPaymentsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, DashboardOverviewService],
})
export class AnalyticsModule {}
