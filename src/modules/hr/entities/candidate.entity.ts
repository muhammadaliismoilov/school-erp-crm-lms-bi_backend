import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Vacancy } from './vacancy.entity';
import { StaffMember } from './staff-member.entity';
import { CandidateStage } from '../enums/hr.enums';

/** HR "Nomzodlar" — ish nomzodlari (recruitment pipeline). */
@Entity('hr_candidates')
@Index('idx_hr_candidates_stage', ['stage'])
@Index('idx_hr_candidates_vacancy', ['vacancyId'])
export class Candidate extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName: string;

  @Column({ type: 'varchar', length: 120 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ name: 'vacancy_id', type: 'uuid', nullable: true })
  vacancyId?: string | null;

  @ManyToOne(() => Vacancy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vacancy_id' })
  vacancy?: Vacancy | null;

  @Column({ name: 'recruiter_id', type: 'uuid', nullable: true })
  recruiterId?: string | null;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recruiter_id' })
  recruiter?: StaffMember | null;

  @Column({ type: 'enum', enum: CandidateStage, default: CandidateStage.NEW })
  stage: CandidateStage;

  /** Joriy bosqich uchun ixtiyoriy status izohi. */
  @Column({ name: 'stage_status', type: 'varchar', length: 120, nullable: true })
  stageStatus?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
