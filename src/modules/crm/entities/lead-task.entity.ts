import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../identity/entities/user.entity';
import { Lead } from './lead.entity';

@Entity('lead_tasks')
export class LeadTask extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, (lead) => lead.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User | null;

  @Column({ name: 'task_type', type: 'varchar', length: 80 })
  taskType: string;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt?: Date | null;

  @Column({ type: 'varchar', length: 40, default: 'open' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
