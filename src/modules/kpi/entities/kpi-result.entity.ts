import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { KpiPeriodType, KpiTargetType } from '../enums/kpi.enums';
@Entity('kpi_results')
@Index(['targetType', 'targetId', 'periodStart', 'periodEnd'])
export class KpiResult extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ name: 'metric_id', type: 'uuid' }) metricId: string;
  @Column({ name: 'target_type', type: 'enum', enum: KpiTargetType }) targetType: KpiTargetType;
  @Column({ name: 'target_id', type: 'uuid', nullable: true }) targetId?: string | null;
  @Column({ name: 'period_type', type: 'enum', enum: KpiPeriodType }) periodType: KpiPeriodType;
  @Column({ name: 'period_start', type: 'date' }) periodStart: string;
  @Column({ name: 'period_end', type: 'date' }) periodEnd: string;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) value: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true }) target?: number | null;
  @Column({ type: 'numeric', precision: 7, scale: 2, nullable: true }) score?: number | null;
  @Column({ type: 'text', nullable: true }) comment?: string | null;
}
