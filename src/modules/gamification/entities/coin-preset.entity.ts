import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

/** Tanga berish/ayrish uchun sozlanadigan preset (jurnal katak editorida ko'rinadi). */
@Entity('coin_presets')
@Index('idx_coin_presets_active', ['isActive'])
export class CoinPreset extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ type: 'int' }) amount: number;
  @Column({ type: 'varchar', length: 64, nullable: true }) icon?: string | null;
  @Column({ type: 'varchar', length: 9, nullable: true }) color?: string | null;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean;
}
