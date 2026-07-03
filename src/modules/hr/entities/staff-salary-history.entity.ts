import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StaffMember } from './staff-member.entity';

/**
 * Xodim maoshining o'zgarishlar tarixi. Har safar maosh o'zgartirilganda
 * (yoki xodim yaratilganda boshlang'ich qiymat bilan) yangi yozuv qo'shiladi.
 * "Maosh tarixi" modalida ko'rsatiladi.
 */
@Entity('hr_staff_salary_history')
@Index('idx_hr_salary_history_staff', ['staffMemberId'])
export class StaffSalaryHistory extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, (staff) => staff.salaryHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember;

  @Column({ name: 'old_salary', type: 'numeric', precision: 14, scale: 2, nullable: true })
  oldSalary?: number | null;

  @Column({ name: 'new_salary', type: 'numeric', precision: 14, scale: 2 })
  newSalary: number;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ name: 'changed_by_id', type: 'uuid', nullable: true })
  changedById?: string | null;

  @Column({ name: 'changed_by_name', type: 'varchar', length: 160, nullable: true })
  changedByName?: string | null;
}
