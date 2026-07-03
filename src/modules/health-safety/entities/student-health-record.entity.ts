import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('student_health_records')
@Index('uq_student_health_records_student', ['studentId'], { unique: true })
export class StudentHealthRecord extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'blood_type', type: 'varchar', length: 10, nullable: true })
  bloodType?: string | null;

  @Column({ name: 'allergies', type: 'text', nullable: true })
  allergies?: string | null;

  @Column({ name: 'medical_notes', type: 'text', nullable: true })
  medicalNotes?: string | null;

  @Column({ name: 'emergency_contact', type: 'varchar', length: 160, nullable: true })
  emergencyContact?: string | null;

}
