import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AttendanceStatus } from '../../../common/enums/attendance-status.enum';
import { User } from '../../identity/entities/user.entity';

@Entity('staff_attendance_records')
@Index('uq_staff_attendance_user_date', ['userId', 'date'], { unique: true })
export class StaffAttendanceRecord extends UuidAuditEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ name: 'check_in_time', type: 'time', nullable: true })
  checkInTime?: string | null;

  @Column({ name: 'check_out_time', type: 'time', nullable: true })
  checkOutTime?: string | null;
}
