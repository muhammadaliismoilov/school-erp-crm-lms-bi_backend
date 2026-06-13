import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { SignStatus } from '../enums/documents.enums';

@Entity('document_sign_requests')
@Index(['documentId', 'signerId'])
export class SignRequest extends UuidAuditEntity {
  @Column({ name: 'document_id', type: 'uuid' }) documentId: string;
  @Column({ name: 'signer_id', type: 'uuid' }) signerId: string;
  @Column({ name: 'signer_type', length: 80 }) signerType: string;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true }) sentAt?: Date | null;
  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true }) signedAt?: Date | null;
  @Column({ type: 'enum', enum: SignStatus, default: SignStatus.PENDING }) status: SignStatus;
  @Column({ name: 'reject_reason', type: 'text', nullable: true }) rejectReason?: string | null;
}
