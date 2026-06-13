import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('timetable_templates')
@Index('idx_timetable_templates_class', ['classId'])
export class TimetableTemplate extends UuidAuditEntity {
  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'academic_year_id', type: 'uuid', nullable: true })
  academicYearId?: string | null;

  @Column({ name: 'class_id', type: 'uuid', nullable: true })
  classId?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

}
