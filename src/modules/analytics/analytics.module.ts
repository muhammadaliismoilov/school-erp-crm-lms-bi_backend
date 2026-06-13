import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from '../finance/entities/contract.entity';
import { Payment } from '../finance/entities/payment.entity';
import { StaffMember } from '../hr/entities/staff-member.entity';
import { User } from '../identity/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({ imports: [TypeOrmModule.forFeature([Student, User, Contract, Payment, StaffMember])], controllers: [AnalyticsController], providers: [AnalyticsService] })
export class AnalyticsModule {}
