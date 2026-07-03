import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Subject } from '../academic/entities/subject.entity';
import { StaffMember } from '../hr/entities/staff-member.entity';
import { Teacher } from '../hr/entities/teacher.entity';
import { NotificationsDeliveryModule } from '../notifications-delivery/notifications-delivery.module';
import { Student } from '../students/entities/student.entity';
import { TimetableSlot } from '../timetable/entities/timetable-slot.entity';
import { AttendanceAgendaService } from './attendance-agenda.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceLog } from './entities/attendance-log.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { AttendanceSettings } from './entities/attendance-settings.entity';
import { ClassSession } from './entities/class-session.entity';
import { SessionAttendance } from './entities/session-attendance.entity';
import { SessionAttendanceAudit } from './entities/session-attendance-audit.entity';
import { StaffAttendanceRecord } from './entities/staff-attendance-record.entity';
import { TurnstileAssignment } from './entities/turnstile-assignment.entity';
import { TurnstileDevice } from './entities/turnstile-device.entity';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { SessionAttendanceController } from './session-attendance.controller';
import { SessionAttendanceService } from './session-attendance.service';
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
      ClassSession,
      SessionAttendance,
      SessionAttendanceAudit,
      TimetableSlot,
      Student,
      Subject,
      SchoolClass,
      Teacher,
      StaffMember,
    ]),
    NotificationsDeliveryModule,
  ],
  controllers: [
    AttendanceController,
    IngestionController,
    TurnstileDeviceController,
    SessionAttendanceController,
  ],
  providers: [
    AttendanceService,
    IngestionService,
    DeviceAuthGuard,
    TurnstileDeviceService,
    SessionAttendanceService,
    AttendanceAgendaService,
  ],
})
export class AttendanceModule {}
