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
import { Project } from './entities/project.entity';
import { Task } from './entities/task.entity';
import { Geofence } from './entities/geofence.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      Position,
      StaffMember,
      StaffLeave,
      Payroll,
      StaffSalaryHistory,
      User,
      Role,
      Branch,
      School,
      Project,
      Task,
      Geofence,
      AttendanceRecord,
    ]),
    UsersModule,
  ],
  controllers: [HrController],
  providers: [HrService, StaffService, DepartmentService, BranchService, PositionService, LeaveService, TaskService, AttendanceHrService],
  exports: [HrService, StaffService, DepartmentService, BranchService, PositionService, LeaveService, TaskService, AttendanceHrService],
})
export class HrModule {}
