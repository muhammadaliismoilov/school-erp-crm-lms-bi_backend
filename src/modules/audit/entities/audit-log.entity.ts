import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../identity/entities/user.entity';

@Entity('audit_logs')
@Index('idx_audit_logs_entity', ['entity', 'entityId'])
export class AuditLog extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'varchar', length: 120 })
  action: string;

  @Column({ type: 'varchar', length: 120 })
  entity: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 120, nullable: true })
  entityId?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'details_json', type: 'jsonb', nullable: true })
  details?: Record<string, unknown> | null;
}
