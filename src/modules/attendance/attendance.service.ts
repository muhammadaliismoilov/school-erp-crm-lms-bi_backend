import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { RecordStudentAttendanceDto } from './dto/record-student-attendance.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';

/** Kunlik turniket taxtasidagi bitta o'quvchi qatori. */
export interface DailyBoardRow {
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string | null;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
}

export interface DailyBoard {
  date: string;
  rows: DailyBoardRow[];
  summary: { arrived: number; inSchool: number; left: number };
}

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

  /**
   * Kunlik turniket taxtasi — o'quvchi ismi/sinfi bilan kirish-chiqish vaqtlari
   * va yig'ma hisob (faqat kerakli maydonlar; moliyaviy ma'lumot oshkor etilmaydi).
   */
  async dailyBoard(date: string): Promise<DailyBoard> {
    const records = await this.attendanceRecords.find({
      where: tenantWhere<AttendanceRecord>(this.tenant, { date }, { branch: true }),
      relations: { student: { currentClass: true } },
      order: { checkInTime: 'ASC' },
    });

    const rows: DailyBoardRow[] = records.map((r) => ({
      studentId: r.studentId,
      studentName: `${r.student.lastName} ${r.student.firstName}`.trim(),
      studentCode: r.student.studentCode,
      className: r.student.currentClass?.name ?? null,
      status: r.status,
      checkInTime: r.checkInTime ?? null,
      checkOutTime: r.checkOutTime ?? null,
    }));

    return {
      date,
      rows,
      summary: {
        arrived: rows.filter((r) => r.checkInTime).length,
        inSchool: rows.filter((r) => r.checkInTime && !r.checkOutTime).length,
        left: rows.filter((r) => r.checkOutTime).length,
      },
    };
  }
}
