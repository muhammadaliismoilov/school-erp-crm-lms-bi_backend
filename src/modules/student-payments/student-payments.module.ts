import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../academic/entities/academic-year.entity';
import { AuditModule } from '../audit/audit.module';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { PaymentType } from '../transactions/entities/payment-type.entity';
import { PaymentPlanConfig } from './entities/payment-plan-config.entity';
import { PaymentPlanRate } from './entities/payment-plan-rate.entity';
import { StudentPayment } from './entities/student-payment.entity';
import { PaymentPlanService } from './payment-plan.service';
import { StudentBillingService } from './student-billing.service';
import { StudentPaymentsController } from './student-payments.controller';
import { StudentPaymentsService } from './student-payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentPayment,
      Student,
      SchoolClass,
      PaymentType,
      FinanceTransaction,
      PaymentPlanConfig,
      PaymentPlanRate,
      AcademicYear,
    ]),
    AuditModule,
  ],
  controllers: [StudentPaymentsController],
  providers: [StudentPaymentsService, StudentBillingService, PaymentPlanService],
  exports: [StudentPaymentsService, StudentBillingService, PaymentPlanService],
})
export class StudentPaymentsModule {}
