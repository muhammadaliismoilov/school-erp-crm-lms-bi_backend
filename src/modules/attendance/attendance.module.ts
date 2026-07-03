import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceLog } from './entities/attendance-log.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { AttendanceSettings } from './entities/attendance-settings.entity';
import { StaffAttendanceRecord } from './entities/staff-attendance-record.entity';
import { TurnstileAssignment } from './entities/turnstile-assignment.entity';
import { TurnstileDevice } from './entities/turnstile-device.entity';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { TurnstileDeviceController } from './turnstile-device.controller';
import { TurnstileDeviceService } from './turnstile-device.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecord,
      StaffAttendanceRecord,
      TurnstileAssignment,
      AttendanceLog,
      AttendanceSettings,
      TurnstileDevice,
    ]),
  ],
  controllers: [AttendanceController, IngestionController, TurnstileDeviceController],
  providers: [AttendanceService, IngestionService, DeviceAuthGuard, TurnstileDeviceService],
})
export class AttendanceModule {}
