import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { User } from '../../identity/entities/user.entity';
import { LeadStatus } from '../enums/lead-status.enum';
import { LeadApplication } from './lead-application.entity';
import { LeadSource } from './lead-source.entity';
import { LeadTask } from './lead-task.entity';
import { PipelineStage } from './pipeline-stage.entity';

@Entity('leads')
@Index('idx_leads_phone', ['phone'])
@Index('idx_leads_status', ['status'])
export class Lead extends UuidAuditEntity {
  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80, nullable: true })
  lastName?: string | null;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email?: string | null;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId?: string | null;

  @ManyToOne(() => LeadSource, (source) => source.leads, { nullable: true })
  @JoinColumn({ name: 'source_id' })
  source?: LeadSource | null;

  @Column({ name: 'stage_id', type: 'uuid', nullable: true })
  stageId?: string | null;

  @ManyToOne(() => PipelineStage, (stage) => stage.leads, { nullable: true })
  @JoinColumn({ name: 'stage_id' })
  stage?: PipelineStage | null;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'referral_code', type: 'varchar', length: 80, nullable: true })
  referralCode?: string | null;

  @OneToMany(() => LeadTask, (task) => task.lead)
  tasks: LeadTask[];

  @OneToMany(() => LeadApplication, (application) => application.lead)
  applications: LeadApplication[];
}
