import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { DataEntityType, DataJobStatus, DataJobType } from '../enums/imports-exports.enums';

@Entity('data_jobs')
@Index(['type', 'entityType', 'status'])
export class DataJob extends UuidAuditEntity {
  @Column({ type: 'enum', enum: DataJobType }) type: DataJobType;
  @Column({ name: 'entity_type', type: 'enum', enum: DataEntityType, default: DataEntityType.OTHER }) entityType: DataEntityType;
  @Column({ name: 'file_url', type: 'text', nullable: true }) fileUrl?: string | null;
  @Column({ name: 'requested_by_id', type: 'uuid', nullable: true }) requestedById?: string | null;
  @Column({ type: 'enum', enum: DataJobStatus, default: DataJobStatus.QUEUED }) status: DataJobStatus;
  @Column({ name: 'total_rows', type: 'int', default: 0 }) totalRows: number;
  @Column({ name: 'success_rows', type: 'int', default: 0 }) successRows: number;
  @Column({ name: 'failed_rows', type: 'int', default: 0 }) failedRows: number;
  @Column({ name: 'result_file_url', type: 'text', nullable: true }) resultFileUrl?: string | null;
  @Column({ name: 'error_report', type: 'jsonb', default: () => "'[]'" }) errorReport: Record<string, unknown>[];
}
