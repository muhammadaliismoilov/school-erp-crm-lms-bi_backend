import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AttendanceRecord } from "../attendance/entities/attendance-record.entity";
import { AuditModule } from "../audit/audit.module";
import { CommunicationModule } from "../communication/communication.module";
import { User } from "../identity/entities/user.entity";
import { JournalEntry } from "../lms/entities/journal-entry.entity";
import { Room } from "../settings/entities/room.entity";
import { Student } from "../students/entities/student.entity";
import { AcademicController } from "./academic.controller";
import { AcademicService } from "./academic.service";
import { AcademicYear } from "./entities/academic-year.entity";
import { Course } from "./entities/course.entity";
import { LessonPeriod } from "./entities/lesson-period.entity";
import { Quarter } from "./entities/quarter.entity";
import { SchoolClass } from "./entities/school-class.entity";
import { Subject } from "./entities/subject.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicYear,
      Quarter,
      LessonPeriod,
      Course,
      Subject,
      SchoolClass,
      Room,
      User,
      Student,
      AttendanceRecord,
      JournalEntry,
    ]),
    AuditModule,
    CommunicationModule,
  ],
  controllers: [AcademicController],
  providers: [AcademicService],
  exports: [AcademicService],
})
export class AcademicModule {}
