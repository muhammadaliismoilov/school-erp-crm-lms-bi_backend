import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { LocalizedText } from '../../../common/i18n/locale';
import { Lead } from './lead.entity';

@Entity('lead_sources')
@Index('uq_lead_sources_code', ['code'], { unique: true })
export class LeadSource extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ type: 'varchar', length: 80 })
  code: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  icon?: string | null;

  @OneToMany(() => Lead, (lead) => lead.source)
  leads: Lead[];
}
