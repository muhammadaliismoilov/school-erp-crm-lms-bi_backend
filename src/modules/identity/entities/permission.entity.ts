import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { LocalizedText } from '../../../common/i18n/locale';
import { Role } from './role.entity';

@Entity('permissions')
@Index('uq_permissions_code', ['code'], { unique: true })
export class Permission extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 120 })
  code: string;

  @Column({ type: 'varchar', length: 80 })
  module: string;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedText | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
