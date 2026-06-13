import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('timetable_substitutions')
@Index('idx_timetable_substitutions_slot', ['slotId'])
@Index('idx_timetable_substitutions_date', ['date'])
export class TimetableSubstitution extends UuidAuditEntity {
  @Column({ name: 'slot_id', type: 'uuid' })
  slotId: string;

  @Column({ name: 'original_teacher_id', type: 'uuid', nullable: true })
  originalTeacherId?: string | null;

  @Column({ name: 'substitute_teacher_id', type: 'uuid' })
  substituteTeacherId: string;

  @Column({ name: 'date', type: 'date' })
  date: string;

  @Column({ name: 'reason', type: 'varchar', length: 160, nullable: true })
  reason?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
