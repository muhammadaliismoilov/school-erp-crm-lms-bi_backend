import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StaffMember } from './staff-member.entity';
import { UserGender } from '../../users/enums/user.enums';
import {
  TeacherCategory,
  TeacherDegree,
  TeacherEmploymentType,
  TeacherStatus,
  TeacherWorkType,
} from '../enums/hr.enums';

/**
 * O'qituvchilar ro'yxati — maktab o'qituvchilarining alohida registri.
 * Ixtiyoriy ravishda xodim (`StaffMember`) yozuviga bog'lanadi, lekin
 * o'qituvchiga xos maydonlar (ish turi, daraja, toifa, stavka, rollar) shu
 * yerda saqlanadi. Form "rasmdagidek": shaxsiy + ish + qo'shimcha ma'lumotlar.
 */
@Entity('hr_teachers')
@Index('idx_hr_teachers_staff', ['staffMemberId'])
@Index('idx_hr_teachers_status', ['status'])
@Index('idx_hr_teachers_category', ['category'])
export class Teacher extends UuidAuditEntity {
  /** Bog'langan xodim yozuvi (ixtiyoriy). */
  @Column({ name: 'staff_member_id', type: 'uuid', nullable: true })
  staffMemberId?: string | null;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember | null;

  // --- Shaxsiy ma'lumotlar ---
  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName: string;

  @Column({ name: 'middle_name', type: 'varchar', length: 80, nullable: true })
  middleName?: string | null;

  @Column({ type: 'enum', enum: UserGender, nullable: true })
  gender?: UserGender | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: string | null;

  /** Hujjat (passport) raqami. */
  @Column({ name: 'document_number', type: 'varchar', length: 32, nullable: true })
  documentNumber?: string | null;

  /** JSHSHIR (PINFL) — 14 raqam. */
  @Column({ type: 'varchar', length: 14, nullable: true })
  pinfl?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email?: string | null;

  // --- Ish ma'lumotlari ---
  @Column({ name: 'work_type', type: 'enum', enum: TeacherWorkType, default: TeacherWorkType.FULL })
  workType: TeacherWorkType;

  @Column({ type: 'enum', enum: TeacherDegree, nullable: true })
  degree?: TeacherDegree | null;

  @Column({ name: 'employment_type', type: 'enum', enum: TeacherEmploymentType, default: TeacherEmploymentType.PRIMARY })
  employmentType: TeacherEmploymentType;

  @Column({ type: 'enum', enum: TeacherStatus, default: TeacherStatus.ACTIVE })
  status: TeacherStatus;

  @Column({ type: 'enum', enum: TeacherCategory, nullable: true })
  category?: TeacherCategory | null;

  /** Ish staji / tajriba (yillarda). */
  @Column({ name: 'experience_years', type: 'integer', default: 0 })
  experienceYears: number;

  /** Dars uchun stavka (soatbay yoki bir dars uchun). */
  @Column({ name: 'rate_per_lesson', type: 'numeric', precision: 14, scale: 2, default: 0 })
  ratePerLesson: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  // --- Qo'shimcha ma'lumotlar (rollar) ---
  @Column({ name: 'is_subject_teacher', type: 'boolean', default: true })
  isSubjectTeacher: boolean;

  @Column({ name: 'is_assistant_teacher', type: 'boolean', default: false })
  isAssistantTeacher: boolean;

  @Column({ name: 'is_mbr', type: 'boolean', default: false })
  isMbr: boolean;

  @Column({ name: 'is_extra_lesson', type: 'boolean', default: false })
  isExtraLesson: boolean;

  @Column({ name: 'is_class_leader', type: 'boolean', default: false })
  isClassLeader: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
