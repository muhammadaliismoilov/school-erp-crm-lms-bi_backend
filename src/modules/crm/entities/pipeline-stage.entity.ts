import { Column, Entity, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { LocalizedText } from '../../../common/i18n/locale';
import { Lead } from './lead.entity';

@Entity('pipeline_stages')
export class PipelineStage extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  order: number;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedText | null;

  @OneToMany(() => Lead, (lead) => lead.stage)
  leads: Lead[];
}
