import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Contract } from '../finance/entities/contract.entity';
import { Payment } from '../finance/entities/payment.entity';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { Student } from '../students/entities/student.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
@Module({ imports: [TypeOrmModule.forFeature([Payment, FinanceTransaction, Contract, Student, AttendanceRecord])], controllers: [ReportsController], providers: [ReportsService], exports: [ReportsService] })
export class ReportsModule {}
