import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('timetable_conflicts')
@Index('idx_timetable_conflicts_slot', ['slotId'])
export class TimetableConflict extends UuidAuditEntity {
  @Column({ name: 'slot_id', type: 'uuid' })
  slotId: string;

  @Column({ name: 'conflict_type', type: 'varchar', length: 60 })
  conflictType: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'resolved', type: 'boolean', default: false })
  resolved: boolean;

}
