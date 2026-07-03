import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AttendanceStatus } from '../../../common/enums/attendance-status.enum';

/**
 * Sessiya davomatidagi har bir tuzatishning o'zgarmas izi: kim, qachon,
 * nimadan nimaga o'zgartirdi. Kechikkan o'quvchini keyin qo'shish ham shu
 * yerda qayd etiladi.
 */
@Entity('session_attendance_audits')
@Index('idx_session_attendance_audit_attendance', ['attendanceId'])
export class SessionAttendanceAudit extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'attendance_id', type: 'uuid' })
  attendanceId: string;

  @Column({ name: 'changed_by_user_id', type: 'uuid', nullable: true })
  changedByUserId?: string | null;

  @Column({ name: 'old_status', type: 'enum', enum: AttendanceStatus, nullable: true })
  oldStatus?: AttendanceStatus | null;

  @Column({ name: 'new_status', type: 'enum', enum: AttendanceStatus })
  newStatus: AttendanceStatus;

  @Column({ name: 'old_minutes_late', type: 'int', nullable: true })
  oldMinutesLate?: number | null;

  @Column({ name: 'new_minutes_late', type: 'int', nullable: true })
  newMinutesLate?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;
}
