import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { RecordStudentAttendanceDto } from './dto/record-student-attendance.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecords: Repository<AttendanceRecord>,
    private readonly tenant: TenantContextService,
  ) {}

  async recordStudentAttendance(dto: RecordStudentAttendanceDto): Promise<AttendanceRecord> {
    const existing = await this.attendanceRecords.findOne({
      where: tenantWhere<AttendanceRecord>(this.tenant, { studentId: dto.studentId, date: dto.date }, { branch: true }),
    });
    // Yangi yozuvda school_id/filial_id ni TenantWriteSubscriber avtomatik qo'yadi.
    const record = existing ?? this.attendanceRecords.create({ studentId: dto.studentId, date: dto.date });
    Object.assign(record, dto);
    return this.attendanceRecords.save(record);
  }

  findByDate(date: string): Promise<AttendanceRecord[]> {
    return this.attendanceRecords.find({
      where: tenantWhere<AttendanceRecord>(this.tenant, { date }, { branch: true }),
      relations: { student: true },
      order: { createdAt: 'ASC' },
    });
  }
}
