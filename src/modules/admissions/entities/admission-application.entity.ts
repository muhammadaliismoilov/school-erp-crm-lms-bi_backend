import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('admission_applications')
@Index('uq_admission_applications_no', ['applicationNo'], { unique: true })
@Index('idx_admission_applications_stage', ['stageId'])
@Index('idx_admission_applications_status', ['status'])
export class AdmissionApplication extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'application_no', type: 'varchar', length: 50 })
  applicationNo: string;

  @Column({ name: 'student_first_name', type: 'varchar', length: 80 })
  studentFirstName: string;

  @Column({ name: 'student_last_name', type: 'varchar', length: 80 })
  studentLastName: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: string | null;

  @Column({ name: 'parent_full_name', type: 'varchar', length: 120 })
  parentFullName: string;

  @Column({ name: 'parent_phone', type: 'varchar', length: 30 })
  parentPhone: string;

  @Column({ name: 'grade_level', type: 'varchar', length: 20 })
  gradeLevel: string;

  @Column({ name: 'source', type: 'varchar', length: 80, nullable: true })
  source?: string | null;

  @Column({ name: 'stage_id', type: 'uuid', nullable: true })
  stageId?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

}
