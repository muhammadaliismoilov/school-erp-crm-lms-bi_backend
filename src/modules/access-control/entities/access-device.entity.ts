import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { DeviceStatus, DeviceType } from '../enums/access-control.enums';

@Entity('access_devices')
@Index(['serialNumber'], { unique: true, where: 'deleted_at IS NULL' })
export class AccessDevice extends UuidAuditEntity {
  @Column({ name: 'serial_number', length: 120 }) serialNumber: string;
  @Column({ length: 180 }) name: string;
  @Column({ type: 'enum', enum: DeviceType }) type: DeviceType;
  @Column({ type: 'varchar', length: 180, nullable: true }) location?: string | null;
  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true }) ipAddress?: string | null;
  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.OFFLINE }) status: DeviceStatus;
  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true }) lastSeenAt?: Date | null;
}
