import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

export enum AppealType {
  SUGGESTION = 'suggestion',
  COMPLAINT = 'complaint',
}

export enum AppealSource {
  MANUAL = 'manual',
  PUBLIC_LINK = 'public_link',
  SYSTEM = 'system',
}

export enum AppealStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum TargetRole {
  CLASS_TEACHER = 'class_teacher',
  DEPUTY_DIRECTOR = 'deputy_director',
  DIRECTOR = 'director',
  ACCOUNTANT = 'accountant',
  SALES_MANAGER = 'sales_manager',
  PSYCHOLOGIST = 'psychologist',
  DOCTOR = 'doctor',
  LIBRARIAN = 'librarian',
}

@Entity('appeals')
@Index('idx_appeals_status', ['status'])
@Index('idx_appeals_type', ['type'])
@Index('idx_appeals_target_role', ['targetRole'])
@Index('idx_appeals_phone', ['phone'])
export class Appeal extends UuidAuditEntity {
  @Column({ name: 'full_name', type: 'varchar', length: 150, nullable: false })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  phone: string;

  @Column({
    type: 'enum',
    enum: AppealType,
    nullable: false,
  })
  type: AppealType;

  @Column({
    name: 'target_role',
    type: 'enum',
    enum: TargetRole,
    nullable: false,
  })
  targetRole: TargetRole;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({
    type: 'enum',
    enum: AppealSource,
    default: AppealSource.PUBLIC_LINK,
    nullable: false,
  })
  source: AppealSource;

  @Column({
    type: 'enum',
    enum: AppealStatus,
    default: AppealStatus.PENDING,
    nullable: false,
  })
  status: AppealStatus;
}
