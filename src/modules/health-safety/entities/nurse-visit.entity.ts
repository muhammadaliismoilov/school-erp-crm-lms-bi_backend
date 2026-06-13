import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('nurse_visits')
@Index('idx_nurse_visits_student', ['studentId'])
export class NurseVisit extends UuidAuditEntity {
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'visited_at', type: 'timestamptz' })
  visitedAt: string;

  @Column({ name: 'complaint', type: 'text' })
  complaint: string;

  @Column({ name: 'treatment', type: 'text', nullable: true })
  treatment?: string | null;

  @Column({ name: 'follow_up_required', type: 'boolean', default: false })
  followUpRequired: boolean;

}
