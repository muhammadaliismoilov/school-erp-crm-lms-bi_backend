import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { LocalizedText } from '../../../common/i18n/locale';
import { User } from './user.entity';
import { Permission } from './permission.entity';

@Entity('roles')
// Global (school_id IS NULL) va maktab ichidagi rollar uchun alohida unikallik:
// bir nom global darajada bitta, har maktab ichida ham bitta bo'lishi mumkin.
@Index('uq_roles_global_name', ['name'], { unique: true, where: 'school_id IS NULL AND deleted_at IS NULL' })
@Index('uq_roles_school_name', ['schoolId', 'name'], { unique: true, where: 'school_id IS NOT NULL AND deleted_at IS NULL' })
@Index('idx_roles_school', ['schoolId'])
export class Role extends UuidAuditEntity {
  /** NULL — global (tizim) rol; aks holda faqat shu maktabga tegishli. */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'jsonb' })
  title: LocalizedText;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedText | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @ManyToMany(() => Permission, (permission) => permission.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
