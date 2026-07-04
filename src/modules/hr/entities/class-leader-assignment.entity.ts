import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { SchoolClass } from '../../academic/entities/school-class.entity';
import { Teacher } from './teacher.entity';

/**
 * Sinf rahbarligi biriktiruvi — qaysi o'qituvchi qaysi sinfga qachondan
 * qachongacha rahbar. Payroll dvigateli oy ichidagi kunlar bo'yicha
 * PROPORTSIONAL to'laydi (oy o'rtasida almashsa ikkala o'qituvchi ham
 * o'z kunlari uchun oladi). `endDate = null` — hozirgacha davom etmoqda.
 */
@Entity('hr_class_leader_assignments')
@Index('idx_hr_cla_teacher', ['teacherId'])
@Index('idx_hr_cla_class', ['classId'])
export class ClassLeaderAssignment extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher?: Teacher;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  schoolClass?: SchoolClass;

  /** Rahbarlik boshlangan sana (shu kun kiradi). */
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  /** Tugagan sana (shu kun ham to'lanadi); null — davom etmoqda. */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
