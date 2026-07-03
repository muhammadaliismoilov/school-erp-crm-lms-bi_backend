import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { SessionStatus } from '../../../common/enums/session-status.enum';
import { SessionType } from '../../../common/enums/session-type.enum';

/**
 * Jadval slotining aniq sanadagi real ko'rinishi (dars yoki kurs sessiyasi).
 * Slotdagi ma'lumotlar (fan/o'qituvchi/sinf/vaqt) shu yerga snapshot qilinadi —
 * shunda keyinchalik jadval o'zgarsa ham tarix buzilmaydi. Davomat yozuvlari
 * aynan shu sessiyaga bog'lanadi.
 */
@Entity('class_sessions')
@Index('uq_class_sessions_slot_date', ['slotId', 'date'], {
  unique: true,
  where: '"slot_id" IS NOT NULL AND "deleted_at" IS NULL',
})
@Index('idx_class_sessions_class_date', ['classId', 'date'])
@Index('idx_class_sessions_teacher_date', ['teacherId', 'date'])
export class ClassSession extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  /** Manba jadval sloti (ad-hoc sessiya bo'lsa null). */
  @Column({ name: 'slot_id', type: 'uuid', nullable: true })
  slotId?: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ name: 'session_type', type: 'enum', enum: SessionType, default: SessionType.LESSON })
  sessionType: SessionType;

  /** Sessiya boshlanish/tugash vaqti (slotdan snapshot). */
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Column({ name: 'confirmed_by_teacher_id', type: 'uuid', nullable: true })
  confirmedByTeacherId?: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date | null;
}
