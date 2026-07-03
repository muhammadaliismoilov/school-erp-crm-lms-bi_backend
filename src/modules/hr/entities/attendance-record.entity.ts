import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AttendanceAction, AttendanceReviewStatus } from '../enums/hr.enums';
import { Geofence } from './geofence.entity';
import { StaffMember } from './staff-member.entity';

@Entity('hr_attendance_records')
@Index('idx_hr_attendance_staff', ['staffMemberId'])
@Index('idx_hr_attendance_status', ['status'])
@Index('idx_hr_attendance_action', ['action'])
export class AttendanceRecord extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember;

  @Column({ type: 'enum', enum: AttendanceAction })
  action: AttendanceAction;

  /** Voqea vaqti (VAQT ustuni). */
  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'now()' })
  recordedAt: Date;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: number | null;

  @Column({ name: 'geofence_id', type: 'uuid', nullable: true })
  geofenceId?: string | null;

  @ManyToOne(() => Geofence, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'geofence_id' })
  geofence?: Geofence | null;

  @Column({ name: 'device_info', type: 'text', nullable: true })
  deviceInfo?: string | null;

  @Column({ type: 'enum', enum: AttendanceReviewStatus, default: AttendanceReviewStatus.PENDING })
  status: AttendanceReviewStatus;
}
