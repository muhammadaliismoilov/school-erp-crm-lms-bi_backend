import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceLog } from './entities/attendance-log.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { StaffAttendanceRecord } from './entities/staff-attendance-record.entity';
import { TurnstileAssignment } from './entities/turnstile-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecord,
      StaffAttendanceRecord,
      TurnstileAssignment,
      AttendanceLog,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
