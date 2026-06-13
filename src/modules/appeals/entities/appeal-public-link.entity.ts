import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

/**
 * Shareable public link that lets outsiders (parents, pupils) submit appeals
 * without authentication. One active link at a time; rotating creates a new
 * token and deactivates the previous one.
 */
@Entity('appeal_public_links')
@Index('uq_appeal_public_links_token', ['token'], { unique: true })
@Index('idx_appeal_public_links_active', ['isActive'])
export class AppealPublicLink extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 64 })
  token: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string | null;
}
