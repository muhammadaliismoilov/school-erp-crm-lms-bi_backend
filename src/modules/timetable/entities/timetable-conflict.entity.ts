import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('timetable_conflicts')
@Index('idx_timetable_conflicts_slot', ['slotId'])
export class TimetableConflict extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'slot_id', type: 'uuid' })
  slotId: string;

  @Column({ name: 'conflict_type', type: 'varchar', length: 60 })
  conflictType: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'resolved', type: 'boolean', default: false })
  resolved: boolean;

}
