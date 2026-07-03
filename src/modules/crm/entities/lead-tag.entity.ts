import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Lead } from './lead.entity';

/** A reusable colored label for leads ("Issiq", "VIP", ...). */
@Entity('lead_tags')
export class LeadTag extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Index('uq_lead_tags_name', { unique: true })
  @Column({ type: 'varchar', length: 60 })
  name: string;

  /** Hex color shown on the chip, e.g. "#22c55e". */
  @Column({ type: 'varchar', length: 9, nullable: true })
  color?: string | null;

  @ManyToMany(() => Lead, (lead) => lead.tags)
  leads: Lead[];
}
