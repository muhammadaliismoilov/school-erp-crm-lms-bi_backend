import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { Quarter } from './quarter.entity';

@Entity('academic_years')
@Index('uq_academic_years_name', ['name'], { unique: true })
export class AcademicYear extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @OneToMany(() => Quarter, (quarter) => quarter.academicYear)
  quarters: Quarter[];
}
