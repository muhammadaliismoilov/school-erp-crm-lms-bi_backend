import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
@Entity('student_badges')
@Index(['studentId', 'badgeId'], { unique: true, where: 'deleted_at IS NULL' })
export class StudentBadge extends UuidAuditEntity {
  @Column({ name: 'student_id', type: 'uuid' }) studentId: string;
  @Column({ name: 'badge_id', type: 'uuid' }) badgeId: string;
  @Column({ name: 'awarded_by', type: 'uuid', nullable: true }) awardedBy?: string | null;
  @Column({ name: 'awarded_reason', type: 'text', nullable: true }) awardedReason?: string | null;
}
