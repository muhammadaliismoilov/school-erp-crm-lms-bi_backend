import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { ProjectStatus } from '../enums/hr.enums';
import { Task } from './task.entity';

/**
 * HR loyihasi. "Loyihalar" sahifasida boshqariladi; "Vazifalar" shu loyihalarga
 * bog'lanadi. Hozircha minimal — Loyihalar feature'i kengaytiradi.
 */
@Entity('hr_projects')
@Index('uq_hr_projects_name_active', ['name'], { unique: true, where: 'deleted_at IS NULL' })
export class Project extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];
}
