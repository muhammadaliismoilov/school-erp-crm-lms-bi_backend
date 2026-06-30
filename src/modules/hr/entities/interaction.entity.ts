import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Candidate } from './candidate.entity';
import { InteractionStatus, InteractionType } from '../enums/hr.enums';

/** HR "Muloqotlar" — nomzodlar bilan muloqotlar (qo'ng'iroq, uchrashuv, suhbat...). */
@Entity('hr_interactions')
@Index('idx_hr_interactions_status', ['status'])
@Index('idx_hr_interactions_candidate', ['candidateId'])
export class Interaction extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'enum', enum: InteractionType, default: InteractionType.CALL })
  type: InteractionType;

  @Column({ type: 'enum', enum: InteractionStatus, default: InteractionStatus.PLANNED })
  status: InteractionStatus;

  @Column({ name: 'candidate_id', type: 'uuid', nullable: true })
  candidateId?: string | null;

  @ManyToOne(() => Candidate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'candidate_id' })
  candidate?: Candidate | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location?: string | null;

  /** Boshlanish (rejalashtirilgan) vaqti. */
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt?: Date | null;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  purpose?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  result?: string | null;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'next_steps', type: 'text', nullable: true })
  nextSteps?: string | null;
}
