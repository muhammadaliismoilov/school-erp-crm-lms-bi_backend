import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Student } from './student.entity';

/**
 * Rich admission record captured when a successful (contract) CRM lead is
 * enrolled as a student. Keeps the heavyweight intake fields off `students`
 * while preserving a 1:1 link and the originating lead.
 */
@Entity('student_admissions')
@Index('uq_student_admissions_student', ['studentId'], { unique: true })
export class StudentAdmission extends UuidAuditEntity {
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @OneToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  /** CRM lead this admission was converted from. */
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId?: string | null;

  // --- Student personal (extra) ---
  @Column({ name: 'middle_name', type: 'varchar', length: 80, nullable: true })
  middleName?: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  nationality?: string | null;

  // --- Birth certificate ---
  @Column({ name: 'birth_certificate_series', type: 'varchar', length: 20, nullable: true })
  birthCertificateSeries?: string | null;

  @Column({ name: 'birth_certificate_number', type: 'varchar', length: 40, nullable: true })
  birthCertificateNumber?: string | null;

  // --- Passport ---
  @Column({ name: 'passport', type: 'varchar', length: 40, nullable: true })
  passport?: string | null;

  @Column({ name: 'jshshir', type: 'varchar', length: 32, nullable: true })
  jshshir?: string | null;

  @Column({ name: 'passport_issued_date', type: 'date', nullable: true })
  passportIssuedDate?: string | null;

  // --- Guardian snapshot (also persisted as a Parent record) ---
  @Column({ name: 'guardian_full_name', type: 'varchar', length: 160 })
  guardianFullName: string;

  @Column({ name: 'guardian_relation', type: 'varchar', length: 40, nullable: true })
  guardianRelation?: string | null;

  @Column({ name: 'guardian_passport', type: 'varchar', length: 40, nullable: true })
  guardianPassport?: string | null;

  @Column({ name: 'guardian_jshshir', type: 'varchar', length: 32, nullable: true })
  guardianJshshir?: string | null;

  @Column({ name: 'guardian_phone', type: 'varchar', length: 32 })
  guardianPhone: string;

  // --- Address ---
  @Column({ type: 'varchar', length: 80, nullable: true })
  region?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  district?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'personal_phone', type: 'varchar', length: 32, nullable: true })
  personalPhone?: string | null;
}
