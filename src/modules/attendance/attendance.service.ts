import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordStudentAttendanceDto } from './dto/record-student-attendance.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecords: Repository<AttendanceRecord>,
  ) {}

  async recordStudentAttendance(dto: RecordStudentAttendanceDto): Promise<AttendanceRecord> {
    const existing = await this.attendanceRecords.findOne({
      where: { studentId: dto.studentId, date: dto.date },
    });
    const record = existing ?? this.attendanceRecords.create({ studentId: dto.studentId, date: dto.date });
    Object.assign(record, dto);
    return this.attendanceRecords.save(record);
  }

  findByDate(date: string): Promise<AttendanceRecord[]> {
    return this.attendanceRecords.find({
      where: { date },
      relations: { student: true },
      order: { createdAt: 'ASC' },
    });
  }
}
