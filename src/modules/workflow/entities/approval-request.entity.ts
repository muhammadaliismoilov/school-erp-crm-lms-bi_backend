import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { ApprovalPriority, ApprovalStatus } from '../enums/workflow.enums';

@Entity('approval_requests')
@Index(['entityType', 'entityId'])
export class ApprovalRequest extends UuidAuditEntity {
  @Column({ name: 'entity_type', length: 100 }) entityType: string;
  @Column({ name: 'entity_id', type: 'uuid' }) entityId: string;
  @Column({ name: 'requested_by_id', type: 'uuid', nullable: true }) requestedById?: string | null;
  @Column({ name: 'approver_id', type: 'uuid', nullable: true }) approverId?: string | null;
  @Column({ length: 220 }) title: string;
  @Column({ type: 'text', nullable: true }) description?: string | null;
  @Column({ type: 'enum', enum: ApprovalPriority, default: ApprovalPriority.NORMAL }) priority: ApprovalPriority;
  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING }) status: ApprovalStatus;
  @Column({ name: 'decision_comment', type: 'text', nullable: true }) decisionComment?: string | null;
  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true }) decidedAt?: Date | null;
}
