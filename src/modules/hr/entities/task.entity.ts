import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { TaskPriority, TaskStatus } from '../enums/hr.enums';
import { Project } from './project.entity';
import { StaffMember } from './staff-member.entity';

@Entity('hr_tasks')
@Index('idx_hr_tasks_status', ['status'])
@Index('idx_hr_tasks_priority', ['priority'])
@Index('idx_hr_tasks_project', ['projectId'])
@Index('idx_hr_tasks_assignee', ['assigneeId'])
export class Task extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @ManyToOne(() => Project, (project) => project.tasks, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  /** Ijrochi (xodim). */
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId?: string | null;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: StaffMember | null;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;
}
