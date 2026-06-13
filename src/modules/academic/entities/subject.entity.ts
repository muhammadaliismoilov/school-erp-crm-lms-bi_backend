import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import type { LocalizedText } from '../../../common/i18n/locale';

@Entity('subjects')
@Index('uq_subjects_code_active', ['code'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('uq_subjects_normalized_name_active', ['normalizedName'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('idx_subjects_status', ['status'])
export class Subject extends UuidAuditEntity {
  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ name: 'normalized_name', type: 'varchar', length: 160 })
  normalizedName: string;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 7, default: '#2563EB' })
  color: string;

  @Column({ type: 'varchar', length: 20, default: CommonStatus.ACTIVE })
  status: CommonStatus;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedText | null;
}
