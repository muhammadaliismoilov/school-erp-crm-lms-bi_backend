import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { DocumentTemplateStatus, DocumentType } from '../enums/documents.enums';

@Entity('document_templates')
@Index(['code'], { unique: true, where: 'deleted_at IS NULL' })
export class DocumentTemplate extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ length: 80 }) code: string;
  @Column({ length: 180 }) name: string;
  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.OTHER }) type: DocumentType;
  @Column({ type: 'text' }) body: string;
  @Column({ name: 'variables', type: 'jsonb', default: () => "'[]'" }) variables: string[];
  @Column({ type: 'enum', enum: DocumentTemplateStatus, default: DocumentTemplateStatus.ACTIVE }) status: DocumentTemplateStatus;
}
