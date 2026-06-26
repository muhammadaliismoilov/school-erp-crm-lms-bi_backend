import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { PaymentType } from '../transactions/entities/payment-type.entity';
import { StudentPayment } from './entities/student-payment.entity';
import { StudentBillingService } from './student-billing.service';
import { StudentPaymentsController } from './student-payments.controller';
import { StudentPaymentsService } from './student-payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentPayment, Student, SchoolClass, PaymentType, FinanceTransaction]),
    AuditModule,
  ],
  controllers: [StudentPaymentsController],
  providers: [StudentPaymentsService, StudentBillingService],
  exports: [StudentPaymentsService, StudentBillingService],
})
export class StudentPaymentsModule {}
