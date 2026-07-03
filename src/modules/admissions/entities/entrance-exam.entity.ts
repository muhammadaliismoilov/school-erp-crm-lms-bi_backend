import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('entrance_exams')
@Index('idx_entrance_exams_application', ['applicationId'])
export class EntranceExam extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'subject', type: 'varchar', length: 80 })
  subject: string;

  @Column({ name: 'exam_date', type: 'timestamptz' })
  examDate: string;

  @Column({ name: 'score', type: 'numeric', precision: 14, scale: 2, default: 0, nullable: true })
  score?: number | null;

  @Column({ name: 'max_score', type: 'numeric', precision: 14, scale: 2, default: 0, nullable: true })
  maxScore?: number | null;

  @Column({ name: 'result', type: 'varchar', length: 40, nullable: true })
  result?: string | null;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment?: string | null;

}
