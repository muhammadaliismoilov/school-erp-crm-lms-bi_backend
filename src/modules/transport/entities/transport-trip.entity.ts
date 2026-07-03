import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { TripStatus } from '../enums/transport.enums';

@Entity('transport_trips')
@Index(['routeId', 'tripDate'])
export class TransportTrip extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'route_id', type: 'uuid' }) routeId: string;
  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true }) vehicleId?: string | null;
  @Column({ name: 'driver_id', type: 'uuid', nullable: true }) driverId?: string | null;
  @Column({ name: 'trip_date', type: 'date' }) tripDate: string;
  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.PLANNED }) status: TripStatus;
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true }) startedAt?: Date | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt?: Date | null;
}
