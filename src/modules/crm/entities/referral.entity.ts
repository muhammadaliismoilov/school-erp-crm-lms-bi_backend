import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../identity/entities/user.entity';
import { ReferralTemplate } from '../enums/referral-template.enum';
import { LeadSource } from './lead-source.entity';

/**
 * A shareable referral link. Each referral exposes a public landing page at
 * `/referral/:code` where outsiders submit their contact — the resulting lead
 * is attributed to this referral's source and code.
 */
@Entity('crm_referrals')
@Index('uq_crm_referrals_code', ['code'], { unique: true })
@Index('idx_crm_referrals_active', ['isActive'])
export class Referral extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Public, URL-safe code embedded in the shareable link. */
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId?: string | null;

  @ManyToOne(() => LeadSource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_id' })
  source?: LeadSource | null;

  /** When the link stops accepting submissions. Null = no expiry. */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'enum', enum: ReferralTemplate, default: ReferralTemplate.CLASSIC })
  template: ReferralTemplate;

  @Column({ name: 'theme_color', type: 'varchar', length: 9, nullable: true })
  themeColor?: string | null;

  /** Manual on/off switch, independent of expiry. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;
}
