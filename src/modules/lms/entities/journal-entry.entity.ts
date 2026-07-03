import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AttendanceStatus } from '../../../common/enums/attendance-status.enum';
import { Student } from '../../students/entities/student.entity';
import { LessonSchedule } from './lesson-schedule.entity';

@Entity('lms_journal_entries')
@Index('idx_lms_journal_lesson', ['lessonId'])
@Index('idx_lms_journal_student', ['studentId'])
export class JournalEntry extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'lesson_id', type: 'uuid' }) lessonId: string;
  @ManyToOne(() => LessonSchedule, (lesson) => lesson.journalEntries, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'lesson_id' }) lesson: LessonSchedule;
  @Column({ name: 'student_id', type: 'uuid' }) studentId: string;
  @ManyToOne(() => Student, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: Student;
  @Column({ type: 'smallint', nullable: true }) grade?: number | null;
  /** 100 ballik baho (0–100), 5 ballik bahodan mustaqil. */
  @Column({ type: 'smallint', nullable: true }) ball?: number | null;
  /** Dars davomati (kelgan/kelmagan/kechikkan/sababli). */
  @Column({ type: 'enum', enum: AttendanceStatus, nullable: true }) attendance?: AttendanceStatus | null;
  @Column({ name: 'homework_done', type: 'boolean', default: false }) homeworkDone: boolean;
  @Column({ type: 'text', nullable: true }) comment?: string | null;
}
