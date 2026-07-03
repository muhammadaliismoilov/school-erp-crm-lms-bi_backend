import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StaffMember } from './staff-member.entity';
import {
  TeacherDegree,
  TeacherEmploymentType,
  TeacherStatus,
  TeacherWorkType,
} from '../enums/hr.enums';

/**
 * O'qituvchilar ro'yxati — maktab o'qituvchilarining alohida registri.
 * Har bir o'qituvchi majburan bitta xodimga (`StaffMember`) bog'lanadi.
 * Shaxsiy ma'lumot (ism, pinfl, telefon...) va malaka toifasi XODIMDA saqlanadi —
 * bu yerda faqat o'qituvchiga xos maydonlar: ish turi, daraja, stavka, rollar.
 */
@Entity('hr_teachers')
// Bir xodimga faqat bitta faol o'qituvchi to'g'ri keladi (soft-delete
// qilinganlar hisobga olinmaydi) — "o'qituvchi = xodim" modeli.
@Index('uq_hr_teachers_staff_active', ['staffMemberId'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_hr_teachers_status', ['status'])
export class Teacher extends UuidAuditEntity {
  /** Bog'langan xodim yozuvi — shaxsiy ma'lumotning yagona manbasi (majburiy). */
  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  // onDelete: 'SET NULL' saqlanadi (mavjud FK bilan mos) — xodimlar soft-delete
  // qilingani uchun bu amalda ishga tushmaydi; NOT NULL bilan birga xodimni
  // qattiq o'chirib bo'lmasligini kafolatlaydi.
  @OneToOne(() => StaffMember, { nullable: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember: StaffMember;

  // --- Ish ma'lumotlari ---
  @Column({ name: 'work_type', type: 'enum', enum: TeacherWorkType, default: TeacherWorkType.FULL })
  workType: TeacherWorkType;

  @Column({ type: 'enum', enum: TeacherDegree, nullable: true })
  degree?: TeacherDegree | null;

  @Column({ name: 'employment_type', type: 'enum', enum: TeacherEmploymentType, default: TeacherEmploymentType.PRIMARY })
  employmentType: TeacherEmploymentType;

  @Column({ type: 'enum', enum: TeacherStatus, default: TeacherStatus.ACTIVE })
  status: TeacherStatus;

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
