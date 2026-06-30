import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Department } from './department.entity';
import { Position } from './position.entity';
import { StaffMember } from './staff-member.entity';
import { VacancyStatus } from '../enums/hr.enums';

/** HR "Vakansiyalar" — ochiq ish o'rinlari. */
@Entity('hr_vacancies')
@Index('idx_hr_vacancies_status', ['status'])
export class Vacancy extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'enum', enum: VacancyStatus, default: VacancyStatus.OPEN })
  status: VacancyStatus;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @Column({ name: 'position_id', type: 'uuid', nullable: true })
  positionId?: string | null;

  @ManyToOne(() => Position, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'position_id' })
  position?: Position | null;

  /** Rekrut (mas'ul xodim). */
  @Column({ name: 'recruiter_id', type: 'uuid', nullable: true })
  recruiterId?: string | null;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recruiter_id' })
  recruiter?: StaffMember | null;

  @Column({ name: 'min_salary', type: 'numeric', precision: 14, scale: 2, nullable: true })
  minSalary?: number | null;

  @Column({ name: 'max_salary', type: 'numeric', precision: 14, scale: 2, nullable: true })
  maxSalary?: number | null;

  /** Ish o'rinlarini boshqarish (mas'uliyatlar). */
  @Column({ type: 'text', nullable: true })
  responsibilities?: string | null;

  /** Talablar. */
  @Column({ type: 'text', nullable: true })
  requirements?: string | null;
}
