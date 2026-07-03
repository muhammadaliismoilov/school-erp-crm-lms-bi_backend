import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AttendanceSource } from '../../../common/enums/attendance-source.enum';
import { AttendanceStatus } from '../../../common/enums/attendance-status.enum';
import { ClassSession } from './class-session.entity';

/**
 * Bitta o'quvchining bitta sessiyadagi (dars/kurs) davomati. Har sessiya × har
 * o'quvchi uchun bitta yozuv. Turniketdan avtomatik oldindan to'ldiriladi
 * (source=AUTO), o'qituvchi tasdiqlaydi yoki tuzatadi (source=MANUAL).
 */
@Entity('session_attendances')
@Index('uq_session_attendance_session_student', ['sessionId', 'studentId'], { unique: true })
@Index('idx_session_attendance_student', ['studentId'])
export class SessionAttendance extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => ClassSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ClassSession;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  /** Kechikish daqiqasi (LATE bo'lganda). */
  @Column({ name: 'minutes_late', type: 'int', nullable: true })
  minutesLate?: number | null;

  @Column({ type: 'enum', enum: AttendanceSource, default: AttendanceSource.AUTO })
  source: AttendanceSource;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;
}
