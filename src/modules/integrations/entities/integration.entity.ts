import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

export enum IntegrationCode {
  OPENAI = 'openai',
  ONLINE_PBX = 'onlinepbx',
}

export enum IntegrationCategory {
  AI_ASSISTANTS = 'AI va yordamchilar',
  TELEPHONY = 'Aloqa va telefoniya',
}

export enum OpenAiModel {
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O = 'gpt-4o',
  GPT_4_1_MINI = 'gpt-4.1-mini',
}

@Entity('integrations')
@Index('uq_integrations_code', ['code'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('idx_integrations_category', ['category'])
@Index('idx_integrations_is_enabled', ['isEnabled'])
export class Integration extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  code: IntegrationCode | string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: false })
  category: IntegrationCategory | string;

  @Column({ name: 'is_enabled', type: 'boolean', default: false, nullable: false })
  isEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  config: Record<string, unknown>;
}
