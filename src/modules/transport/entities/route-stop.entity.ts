import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('transport_route_stops')
@Index(['routeId', 'orderIndex'])
export class RouteStop extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'route_id', type: 'uuid' }) routeId: string;
  @Column({ length: 180 }) name: string;
  @Column({ name: 'order_index', type: 'int', default: 0 }) orderIndex: number;
  @Column({ name: 'arrival_time', type: 'varchar', length: 10, nullable: true }) arrivalTime?: string | null;
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) latitude?: number | null;
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true }) longitude?: number | null;
}
