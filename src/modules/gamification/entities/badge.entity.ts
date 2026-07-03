import { Column, Entity } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
@Entity('badges')
export class Badge extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ length: 120 }) title: string;
  @Column({ type: 'text', nullable: true }) description?: string | null;
  @Column({ name: 'icon_url', type: 'varchar', nullable: true }) iconUrl?: string | null;
  @Column({ type: 'jsonb', default: () => "'{}'" }) rules: Record<string, unknown>;
}
