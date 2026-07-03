import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { RouteStatus } from '../enums/transport.enums';

@Entity('transport_routes')
@Index(['name'])
export class TransportRoute extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ length: 160 }) name: string;
  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true }) vehicleId?: string | null;
  @Column({ name: 'driver_id', type: 'uuid', nullable: true }) driverId?: string | null;
  @Column({ name: 'start_time', type: 'varchar', length: 10, nullable: true }) startTime?: string | null;
  @Column({ name: 'end_time', type: 'varchar', length: 10, nullable: true }) endTime?: string | null;
  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.ACTIVE }) status: RouteStatus;
}
