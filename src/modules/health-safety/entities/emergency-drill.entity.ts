import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('emergency_drills')
@Index('idx_emergency_drills_date', ['drillDate'])
export class EmergencyDrill extends UuidAuditEntity {
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
