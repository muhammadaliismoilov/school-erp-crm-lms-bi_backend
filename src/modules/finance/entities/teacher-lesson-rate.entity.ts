import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AcademicYear } from '../../academic/entities/academic-year.entity';
import { User } from '../../identity/entities/user.entity';

/**
 * O'qituvchi uchun bitta dars boshiga to'lov stavkasi. Akademik yil bo'yicha
 * saqlanadi — har yili stavka qayta belgilanishi mumkin. Oylik maosh hisoblanganda
 * shu stavka snapshot sifatida `teacher_salaries.rate_per_lesson` ga ko'chiriladi.
 */
@Entity('teacher_lesson_rates')
@Index('uq_teacher_lesson_rates_teacher_year', ['teacherId', 'academicYearId'], {
  unique: true,
})
@Index('idx_teacher_lesson_rates_school', ['schoolId'])
@Index('idx_teacher_lesson_rates_filial', ['filialId'])
export class TeacherLessonRate extends UuidAuditEntity {
  /** Maktab (qattiq tenant chegarasi). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  /** Filial (branch). */
  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ name: 'academic_year_id', type: 'uuid' })
  academicYearId: string;

  @ManyToOne(() => AcademicYear, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'academic_year_id' })
  academicYear: AcademicYear;

  /** Bitta dars uchun to'lov (so'm). */
  @Column({ name: 'rate_per_lesson', type: 'numeric', precision: 14, scale: 2, default: 0 })
  ratePerLesson: number;
}
