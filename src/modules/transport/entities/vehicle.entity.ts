import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { VehicleStatus } from '../enums/transport.enums';

@Entity('transport_vehicles')
@Index(['plateNumber'], { unique: true, where: 'deleted_at IS NULL' })
export class Vehicle extends UuidAuditEntity {
  @Column({ name: 'plate_number', length: 40 }) plateNumber: string;
  @Column({ length: 120 }) model: string;
  @Column({ type: 'int' }) capacity: number;
  @Column({ name: 'driver_id', type: 'uuid', nullable: true }) driverId?: string | null;
  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.ACTIVE }) status: VehicleStatus;
}
