import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AccessDecision, AccessDirection } from '../enums/access-control.enums';

@Entity('access_events')
@Index(['personType', 'personId', 'eventTime'])
export class AccessEvent extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'device_id', type: 'uuid' }) deviceId: string;
  @Column({ name: 'person_type', type: 'varchar', length: 80, nullable: true }) personType?: string | null;
  @Column({ name: 'person_id', type: 'uuid', nullable: true }) personId?: string | null;
  @Column({ type: 'enum', enum: AccessDirection }) direction: AccessDirection;
  @Column({ type: 'enum', enum: AccessDecision }) decision: AccessDecision;
  @Column({ name: 'event_time', type: 'timestamptz' }) eventTime: Date;
  @Column({ name: 'snapshot_url', type: 'text', nullable: true }) snapshotUrl?: string | null;
  @Column({ name: 'reason', type: 'text', nullable: true }) reason?: string | null;
}
