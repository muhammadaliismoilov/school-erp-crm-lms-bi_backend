import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { AcademicYear } from '../../academic/entities/academic-year.entity';
import { Lead } from './lead.entity';

@Entity('crm_lead_applications')
export class LeadApplication extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, (lead) => lead.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'academic_year_id', type: 'uuid', nullable: true })
  academicYearId?: string | null;

  @ManyToOne(() => AcademicYear, { nullable: true })
  @JoinColumn({ name: 'academic_year_id' })
  academicYear?: AcademicYear | null;

  @Column({ name: 'exam_score', type: 'numeric', precision: 6, scale: 2, nullable: true })
  examScore?: number | null;

  @Column({ type: 'varchar', length: 40, default: 'pending' })
  decision: string;

  @Column({ name: 'applied_on', type: 'date' })
  appliedOn: string;
}
