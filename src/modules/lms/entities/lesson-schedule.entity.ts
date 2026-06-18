import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { SchoolClass } from '../../academic/entities/school-class.entity';
import { Course } from '../../academic/entities/course.entity';
import { LessonPeriod } from '../../academic/entities/lesson-period.entity';
import { Quarter } from '../../academic/entities/quarter.entity';
import { Subject } from '../../academic/entities/subject.entity';
import { User } from '../../identity/entities/user.entity';
import { Room } from '../../settings/entities/room.entity';
import { LessonStatus } from '../enums/lms.enums';
import { JournalEntry } from './journal-entry.entity';

@Entity('lms_lesson_schedules')
@Index('idx_lms_lessons_date', ['lessonDate'])
@Index('idx_lms_lessons_class', ['classId'])
@Index('idx_lms_lessons_quarter', ['quarterId'])
@Index('idx_lms_lessons_weekday', ['weekday'])
export class LessonSchedule extends UuidAuditEntity {
  @Column({ name: 'class_id', type: 'uuid' }) classId: string;
  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'class_id' }) class: SchoolClass;
  @Column({ name: 'subject_id', type: 'uuid' }) subjectId: string;
  @ManyToOne(() => Subject, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'subject_id' }) subject: Subject;
  @Column({ name: 'teacher_id', type: 'uuid', nullable: true }) teacherId?: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'teacher_id' }) teacher?: User | null;
  /** Almashtirish belgisi: to'ldirilgan bo'lsa, dars o'qituvchisi o'rinbosarga almashtirilgan. */
  @Column({ name: 'original_teacher_id', type: 'uuid', nullable: true }) originalTeacherId?: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'original_teacher_id' }) originalTeacher?: User | null;
  @Column({ name: 'room_id', type: 'uuid', nullable: true }) roomId?: string | null;
  @ManyToOne(() => Room, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'room_id' }) room?: Room | null;
  /** "Kurs jadvali" rejimi: slotga biriktirilgan mavjud kurs. */
  @Column({ name: 'course_id', type: 'uuid', nullable: true }) courseId?: string | null;
  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'course_id' }) course?: Course | null;
  @Column({ name: 'lesson_period_id', type: 'uuid', nullable: true }) lessonPeriodId?: string | null;
  @ManyToOne(() => LessonPeriod, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'lesson_period_id' }) lessonPeriod?: LessonPeriod | null;
  @Column({ name: 'quarter_id', type: 'uuid', nullable: true }) quarterId?: string | null;
  @ManyToOne(() => Quarter, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'quarter_id' }) quarter?: Quarter | null;
  @Column({ name: 'lesson_date', type: 'date' }) lessonDate: string;
  /** ISO hafta kuni: 1=Dushanba … 7=Yakshanba. lessonDate dan hisoblanadi. */
  @Column({ type: 'smallint', nullable: true }) weekday?: number | null;
  @Column({ type: 'enum', enum: LessonStatus, default: LessonStatus.PLANNED }) status: LessonStatus;
  @Column({ type: 'text', nullable: true }) topic?: string | null;
  @OneToMany(() => JournalEntry, (entry) => entry.lesson) journalEntries: JournalEntry[];
}
