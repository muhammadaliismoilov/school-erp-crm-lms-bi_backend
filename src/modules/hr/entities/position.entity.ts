import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StaffMember } from './staff-member.entity';

@Entity('hr_positions')
@Index('uq_hr_positions_code_active', ['code'], { unique: true, where: 'deleted_at IS NULL' })
export class Position extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ name: 'base_salary', type: 'numeric', precision: 14, scale: 2, default: 0 })
  baseSalary: number;

  @OneToMany(() => StaffMember, (staff) => staff.position)
  staffMembers: StaffMember[];
}
