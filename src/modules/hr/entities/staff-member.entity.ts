import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../identity/entities/user.entity';
import { Department } from './department.entity';
import { Position } from './position.entity';
import { StaffLeave } from './staff-leave.entity';
import { Payroll } from './payroll.entity';
import { StaffSalaryHistory } from './staff-salary-history.entity';
import { StaffCertificate } from './staff-certificate.entity';
import { StaffAchievement } from './staff-achievement.entity';
import { EmploymentStatus, QualificationCategory } from '../enums/hr.enums';
import { UserGender } from '../../users/enums/user.enums';

@Entity('hr_staff_members')
@Index('uq_hr_staff_employee_code_active', ['employeeCode'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_hr_staff_department', ['departmentId'])
@Index('idx_hr_staff_position', ['positionId'])
@Index('idx_hr_staff_school', ['schoolId'])
@Index('idx_hr_staff_filial', ['filialId'])
export class StaffMember extends UuidAuditEntity {
  @Column({ name: 'employee_code', type: 'varchar', length: 40 })
  employeeCode: string;

  /** Maktab (qattiq tenant chegarasi) — ko'p-maktabli ajratish uchun. */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  /** Filial (branch) — maktab ichida. */
  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'first_name_cyrillic', type: 'varchar', length: 80, nullable: true })
  firstNameCyrillic?: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName: string;

  @Column({ name: 'last_name_cyrillic', type: 'varchar', length: 80, nullable: true })
  lastNameCyrillic?: string | null;

  @Column({ name: 'middle_name', type: 'varchar', length: 80, nullable: true })
  middleName?: string | null;

  @Column({ name: 'middle_name_cyrillic', type: 'varchar', length: 80, nullable: true })
  middleNameCyrillic?: string | null;

  @Column({ type: 'enum', enum: UserGender, nullable: true })
  gender?: UserGender | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: string | null;

  @Column({ name: 'passport_series', type: 'varchar', length: 32, nullable: true })
  passportSeries?: string | null;

  @Column({ type: 'varchar', length: 14, nullable: true })
  pinfl?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email?: string | null;

  /**
   * Xodim fotosurati (havola). Barcha xodimlar uchun keldi-ketdi davomati
   * FaceID orqali yuritilgani sabab har bir xodimga rasm biriktiriladi.
   */
  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl?: string | null;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @ManyToOne(() => Department, (department) => department.staffMembers, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @Column({ name: 'position_id', type: 'uuid', nullable: true })
  positionId?: string | null;

  @ManyToOne(() => Position, (position) => position.staffMembers, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'position_id' })
  position?: Position | null;

  @Column({ name: 'hire_date', type: 'date' })
  hireDate: string;

  @Column({ type: 'enum', enum: EmploymentStatus, default: EmploymentStatus.ACTIVE })
  status: EmploymentStatus;

  @Column({ name: 'salary', type: 'numeric', precision: 14, scale: 2, default: 0 })
  salary: number;

  /** O'qituvchining malaka toifasi (faqat o'qituvchilar uchun to'ldiriladi). */
  @Column({ name: 'qualification_category', type: 'enum', enum: QualificationCategory, nullable: true })
  qualificationCategory?: QualificationCategory | null;

  /** Toifa berilgan sana (attestatsiya). */
  @Column({ name: 'qualification_date', type: 'date', nullable: true })
  qualificationDate?: string | null;

  @OneToMany(() => StaffLeave, (leave) => leave.staffMember)
  leaves: StaffLeave[];

  @OneToMany(() => Payroll, (payroll) => payroll.staffMember)
  payrolls: Payroll[];

  @OneToMany(() => StaffSalaryHistory, (history) => history.staffMember)
  salaryHistory: StaffSalaryHistory[];

  @OneToMany(() => StaffCertificate, (certificate) => certificate.staffMember)
  certificates: StaffCertificate[];

  @OneToMany(() => StaffAchievement, (achievement) => achievement.staffMember)
  achievements: StaffAchievement[];
}
