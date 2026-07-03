import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { KpiTargetType } from '../enums/kpi.enums';
@Entity('kpi_metrics')
@Index(['code'], { unique: true, where: 'deleted_at IS NULL' })
export class KpiMetric extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ length: 80 }) code: string;
  @Column({ length: 160 }) title: string;
  @Column({ type: 'text', nullable: true }) description?: string | null;
  @Column({ name: 'target_type', type: 'enum', enum: KpiTargetType }) targetType: KpiTargetType;
  @Column({ name: 'weight', type: 'numeric', precision: 6, scale: 2, default: 1 }) weight: number;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
}
