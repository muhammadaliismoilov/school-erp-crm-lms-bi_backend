import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AcademicYear } from '../academic/entities/academic-year.entity';
import { User } from '../identity/entities/user.entity';
import { LessonSchedule } from '../lms/entities/lesson-schedule.entity';
import { BankAccount } from './entities/bank-account.entity';
import { ContractType } from './entities/contract-type.entity';
import { Contract } from './entities/contract.entity';
import { Discount } from './entities/discount.entity';
import { PaymentPlan } from './entities/payment-plan.entity';
import { Payment } from './entities/payment.entity';
import { TeacherLessonRate } from './entities/teacher-lesson-rate.entity';
import { TeacherSalary } from './entities/teacher-salary.entity';
import { FinanceTransaction } from './entities/transaction.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractType,
      Contract,
      PaymentPlan,
      Payment,
      BankAccount,
      FinanceTransaction,
      Discount,
      TeacherLessonRate,
      TeacherSalary,
      User,
      AcademicYear,
      LessonSchedule,
    ]),
    AuditModule,
  ],
  controllers: [FinanceController, SalaryController],
  providers: [FinanceService, SalaryService],
})
export class FinanceModule {}
