import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('admission_pipelines')
@Index('uq_admission_pipelines_code', ['code'], { unique: true })
export class AdmissionPipeline extends UuidAuditEntity {
  @Column({ name: 'name', type: 'varchar', length: 80 })
  name: string;

  @Column({ name: 'code', type: 'varchar', length: 40 })
  code: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

}
