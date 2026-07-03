import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { CampaignStatus, MessageChannel } from '../enums/communication.enums';

@Entity('communication_campaigns')
@Index(['channel', 'status'])
export class Campaign extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ length: 180 }) name: string;
  @Column({ type: 'enum', enum: MessageChannel }) channel: MessageChannel;
  @Column({ name: 'template_id', type: 'uuid', nullable: true }) templateId?: string | null;
  @Column({ type: 'varchar', length: 220, nullable: true }) subject?: string | null;
  @Column({ type: 'text' }) body: string;
  @Column({ name: 'target_filter', type: 'jsonb', default: () => "'{}'" }) targetFilter: Record<string, unknown>;
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true }) scheduledAt?: Date | null;
  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT }) status: CampaignStatus;
}
