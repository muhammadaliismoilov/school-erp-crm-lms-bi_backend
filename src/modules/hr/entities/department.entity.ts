import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Branch } from '../../settings/entities/branch.entity';
import { StaffMember } from './staff-member.entity';

/** Bo'lim holati. Ro'yxatda "Faol" / "Faol emas" sifatida ko'rsatiladi. */
export enum DepartmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('hr_departments')
@Index('uq_hr_departments_code_active', ['code'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_hr_departments_filial', ['filialId'])
@Index('idx_hr_departments_parent', ['parentId'])
export class Department extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Filial (branch) — bo'lim tegishli bo'lgan filial. */
  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'filial_id' })
  filial?: Branch | null;

  /** Ota bo'lim (ierarxiya uchun). */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Department | null;

  @Column({ name: 'telegram_chat_id', type: 'varchar', length: 64, nullable: true })
  telegramChatId?: string | null;

  @Column({ type: 'enum', enum: DepartmentStatus, default: DepartmentStatus.ACTIVE })
  status: DepartmentStatus;

  @OneToMany(() => StaffMember, (staff) => staff.department)
  staffMembers: StaffMember[];
}
