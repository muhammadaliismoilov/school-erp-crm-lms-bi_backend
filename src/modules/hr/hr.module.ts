import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Payroll } from './entities/payroll.entity';
import { Position } from './entities/position.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffMember } from './entities/staff-member.entity';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Position, StaffMember, StaffLeave, Payroll])],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
