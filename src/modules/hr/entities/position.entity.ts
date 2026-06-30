import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Branch } from '../../settings/entities/branch.entity';
import { School } from '../../settings/entities/school.entity';
import { Department } from './department.entity';
import { StaffMember } from './staff-member.entity';

/** Lavozim holati. Ro'yxatda "Faol" / "Faol emas" sifatida ko'rsatiladi. */
export enum PositionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('hr_positions')
@Index('uq_hr_positions_code_active', ['code'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_hr_positions_department', ['departmentId'])
@Index('idx_hr_positions_filial', ['filialId'])
export class Position extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'base_salary', type: 'numeric', precision: 14, scale: 2, default: 0 })
  baseSalary: number;

  /** Bo'lim — lavozim tegishli bo'lgan bo'lim. */
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  /** Egasi: bosh ofis (asosiy maktab). `filialId` bilan o'zaro istisno. */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @ManyToOne(() => School, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'school_id' })
  school?: School | null;

  /** Filial (branch). */
  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'filial_id' })
  filial?: Branch | null;

  @Column({ type: 'enum', enum: PositionStatus, default: PositionStatus.ACTIVE })
  status: PositionStatus;

  @OneToMany(() => StaffMember, (staff) => staff.position)
  staffMembers: StaffMember[];
}
