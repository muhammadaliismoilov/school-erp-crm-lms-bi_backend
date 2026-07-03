import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StaffMember } from './staff-member.entity';
import { PerformanceReviewStatus } from '../enums/hr.enums';

/** HR "Samaradorlik baholash" — xodimlar samaradorligini baholash. */
@Entity('hr_performance_reviews')
@Index('idx_hr_perf_reviews_staff', ['staffMemberId'])
@Index('idx_hr_perf_reviews_status', ['status'])
export class PerformanceReview extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember;

  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  reviewerId?: string | null;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer?: StaffMember | null;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  /** Umumiy baho (1–5). */
  @Column({ name: 'overall_rating', type: 'numeric', precision: 3, scale: 1, nullable: true })
  overallRating?: number | null;

  @Column({ type: 'text', nullable: true })
  strengths?: string | null;

  @Column({ type: 'text', nullable: true })
  improvements?: string | null;

  @Column({ type: 'text', nullable: true })
  goals?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'enum', enum: PerformanceReviewStatus, default: PerformanceReviewStatus.COMPLETED })
  status: PerformanceReviewStatus;
}
