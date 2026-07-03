import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('scholarships')
@Index('idx_scholarships_student', ['studentId'])
export class Scholarship extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'discount_percent', type: 'numeric', precision: 14, scale: 2, default: 0, nullable: true })
  discountPercent?: number | null;

  @Column({ name: 'fixed_amount', type: 'numeric', precision: 14, scale: 2, default: 0, nullable: true })
  fixedAmount?: number | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
