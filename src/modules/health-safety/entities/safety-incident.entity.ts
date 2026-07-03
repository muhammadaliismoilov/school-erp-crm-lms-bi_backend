import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('safety_incidents')
@Index('idx_safety_incidents_status', ['status'])
export class SafetyIncident extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'title', type: 'varchar', length: 160 })
  title: string;

  @Column({ name: 'incident_at', type: 'timestamptz' })
  incidentAt: string;

  @Column({ name: 'location', type: 'varchar', length: 160, nullable: true })
  location?: string | null;

  @Column({ name: 'severity', type: 'varchar', length: 40 })
  severity: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
