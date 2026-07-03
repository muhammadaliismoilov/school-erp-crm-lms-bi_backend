import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('admission_decisions')
@Index('idx_admission_decisions_application', ['applicationId'])
export class AdmissionDecision extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'decision', type: 'varchar', length: 40 })
  decision: string;

  @Column({ name: 'decided_by_id', type: 'uuid', nullable: true })
  decidedById?: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz' })
  decidedAt: string;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment?: string | null;

}
