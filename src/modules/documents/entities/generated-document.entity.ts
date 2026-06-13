import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { DocumentStatus, DocumentType } from '../enums/documents.enums';

@Entity('generated_documents')
@Index(['ownerType', 'ownerId'])
export class GeneratedDocument extends UuidAuditEntity {
  @Column({ name: 'template_id', type: 'uuid', nullable: true }) templateId?: string | null;
  @Column({ name: 'owner_type', length: 80 }) ownerType: string;
  @Column({ name: 'owner_id', type: 'uuid' }) ownerId: string;
  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.OTHER }) type: DocumentType;
  @Column({ length: 220 }) title: string;
  @Column({ type: 'text' }) content: string;
  @Column({ name: 'file_url', type: 'text', nullable: true }) fileUrl?: string | null;
  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.DRAFT }) status: DocumentStatus;
  @Column({ name: 'metadata', type: 'jsonb', default: () => "'{}'" }) metadata: Record<string, unknown>;
}
