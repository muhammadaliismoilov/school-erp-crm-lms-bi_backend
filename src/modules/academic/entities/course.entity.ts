import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { User } from '../../identity/entities/user.entity';
import { Room } from '../../settings/entities/room.entity';
import { Student } from '../../students/entities/student.entity';
import { Quarter } from './quarter.entity';
import { Subject } from './subject.entity';

@Entity('courses')
@Index('uq_courses_quarter_name_active', ['quarterId', 'normalizedName'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('idx_courses_quarter', ['quarterId'])
@Index('idx_courses_subject', ['subjectId'])
@Index('idx_courses_teacher', ['teacherId'])
@Index('idx_courses_room', ['roomId'])
@Index('idx_courses_status', ['status'])
export class Course extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ name: 'normalized_name', type: 'varchar', length: 160 })
  normalizedName: string;

  @Column({ name: 'quarter_id', type: 'uuid' })
  quarterId: string;

  @ManyToOne(() => Quarter, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quarter_id' })
  quarter: Quarter;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @ManyToOne(() => Room, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ name: 'planned_lesson_count', type: 'int', default: 0 })
  plannedLessonCount: number;

  @Column({ name: 'completed_lesson_count', type: 'int', default: 0 })
  completedLessonCount: number;

  @Column({ type: 'varchar', length: 20, default: CommonStatus.ACTIVE })
  status: CommonStatus;

  @ManyToMany(() => Student)
  @JoinTable({
    name: 'course_students',
    joinColumn: { name: 'course_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'student_id', referencedColumnName: 'id' },
  })
  students: Student[];
}
