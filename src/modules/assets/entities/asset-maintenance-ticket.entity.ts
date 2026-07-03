import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('asset_maintenance_tickets')
@Index('idx_asset_maintenance_tickets_asset', ['assetId'])
@Index('idx_asset_maintenance_tickets_status', ['status'])
export class AssetMaintenanceTicket extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @Column({ name: 'title', type: 'varchar', length: 160 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'priority', type: 'varchar', length: 40 })
  priority: string;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

}
