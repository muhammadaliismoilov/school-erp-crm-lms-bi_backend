import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('emergency_drills')
@Index('idx_emergency_drills_date', ['drillDate'])
export class EmergencyDrill extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'drill_date', type: 'date' })
  drillDate: string;

  @Column({ name: 'drill_type', type: 'varchar', length: 60 })
  drillType: string;

  @Column({ name: 'participants_count', type: 'int' })
  participantsCount: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

}
