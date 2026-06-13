import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('timetable_slots')
@Index('idx_timetable_slots_template', ['templateId'])
@Index('idx_timetable_slots_class', ['classId'])
@Index('idx_timetable_slots_teacher', ['teacherId'])
export class TimetableSlot extends UuidAuditEntity {
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId?: string | null;

  @Column({ name: 'weekday', type: 'int' })
  weekday: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

}
