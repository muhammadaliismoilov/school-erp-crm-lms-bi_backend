import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('admission_stages')
@Index('idx_admission_stages_pipeline', ['pipelineId'])
export class AdmissionStage extends UuidAuditEntity {
  @Column({ name: 'pipeline_id', type: 'uuid' })
  pipelineId: string;

  @Column({ name: 'name', type: 'varchar', length: 80 })
  name: string;

  @Column({ name: 'code', type: 'varchar', length: 40 })
  code: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @Column({ name: 'is_final', type: 'boolean', default: false })
  isFinal: boolean;

}
