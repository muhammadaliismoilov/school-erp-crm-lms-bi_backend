import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('student_transport_assignments')
@Index(['studentId'], { unique: true, where: 'deleted_at IS NULL' })
export class StudentTransportAssignment extends UuidAuditEntity {
  @Column({ name: 'student_id', type: 'uuid' }) studentId: string;
  @Column({ name: 'route_id', type: 'uuid' }) routeId: string;
  @Column({ name: 'pickup_stop_id', type: 'uuid', nullable: true }) pickupStopId?: string | null;
  @Column({ name: 'dropoff_stop_id', type: 'uuid', nullable: true }) dropoffStopId?: string | null;
  @Column({ name: 'monthly_fee', type: 'numeric', precision: 12, scale: 2, default: 0 }) monthlyFee: number;
  @Column({ default: true }) active: boolean;
}
