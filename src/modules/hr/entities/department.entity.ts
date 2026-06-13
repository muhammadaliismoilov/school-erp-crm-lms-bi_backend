import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StaffMember } from './staff-member.entity';

@Entity('hr_departments')
@Index('uq_hr_departments_code_active', ['code'], { unique: true, where: 'deleted_at IS NULL' })
export class Department extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToMany(() => StaffMember, (staff) => staff.department)
  staffMembers: StaffMember[];
}
