import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Contract } from '../finance/entities/contract.entity';
import { Payment } from '../finance/entities/payment.entity';
import { ExamResult } from '../lms/entities/exam-result.entity';
import { JournalEntry } from '../lms/entities/journal-entry.entity';
import { Parent } from '../students/entities/parent.entity';
import { StudentParent } from '../students/entities/student-parent.entity';
import { MealMenu } from '../youth-services/entities/meal-menu.entity';
import { MobilePortalController } from './mobile-portal.controller';
import { MobilePortalService } from './mobile-portal.service';
@Module({ imports: [TypeOrmModule.forFeature([Parent, StudentParent, AttendanceRecord, JournalEntry, ExamResult, Contract, Payment, MealMenu])], controllers: [MobilePortalController], providers: [MobilePortalService], exports: [MobilePortalService] })
export class MobilePortalModule {}
