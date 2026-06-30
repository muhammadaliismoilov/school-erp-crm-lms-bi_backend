import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { LocalizedText } from '../../../common/i18n/locale';
import { School } from './school.entity';

@Entity('branches')
@Index('idx_branches_parent', ['parentId'])
export class Branch extends UuidAuditEntity {
  /** Maktab (ixtiyoriy) — HR "Filiallar" orqali yaratilgan filiallarda bo'sh bo'lishi mumkin. */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @ManyToOne(() => School, (school) => school.branches, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'school_id' })
  school?: School | null;

  /** Ota filial (ierarxiya uchun). */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => Branch, (branch) => branch.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Branch | null;

  @OneToMany(() => Branch, (branch) => branch.parent)
  children?: Branch[];

  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 32, nullable: true })
  contactPhone?: string | null;

  /** Bosh ofis (markaziy filial) hisoblanadimi. */
  @Column({ name: 'is_head_office', type: 'boolean', default: false })
  isHeadOffice: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
