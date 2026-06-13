import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StudentParent } from './student-parent.entity';

@Entity('parents')
@Index('idx_parents_phone', ['phone'])
export class Parent extends UuidAuditEntity {
  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80, nullable: true })
  lastName?: string | null;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email?: string | null;

  @OneToMany(() => StudentParent, (studentParent) => studentParent.parent)
  children: StudentParent[];
}
