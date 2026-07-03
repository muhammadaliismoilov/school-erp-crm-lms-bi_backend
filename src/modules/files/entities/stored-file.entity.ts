import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../identity/entities/user.entity';

@Entity('files')
@Index('idx_files_storage_key', ['storageKey'], { unique: true })
export class StoredFile extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl?: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 160 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ name: 'uploaded_by_id', type: 'uuid', nullable: true })
  uploadedById?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy?: User | null;
}
