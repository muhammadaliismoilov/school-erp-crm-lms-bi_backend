import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AttendanceStatus } from '../../../common/enums/attendance-status.enum';
import { Student } from '../../students/entities/student.entity';

@Entity('attendance_records')
@Index('uq_attendance_student_date', ['studentId', 'date'], { unique: true })
export class AttendanceRecord extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ name: 'check_in_time', type: 'time', nullable: true })
  checkInTime?: string | null;

  @Column({ name: 'check_out_time', type: 'time', nullable: true })
  checkOutTime?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string | null;
}
