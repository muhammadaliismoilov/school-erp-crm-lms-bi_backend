import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import type { LocalizedText } from '../../../common/i18n/locale';
import { QuarterStatus } from '../enums/quarter-status.enum';
import { AcademicYear } from './academic-year.entity';

@Entity('quarters')
@Index('idx_quarters_academic_year', ['academicYearId'])
@Index('uq_quarters_academic_year_number_active', ['academicYearId', 'quarterNumber'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class Quarter extends UuidAuditEntity {
  @Column({ name: 'academic_year_id', type: 'uuid' })
  academicYearId: string;

  @ManyToOne(() => AcademicYear, (academicYear) => academicYear.quarters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'academic_year_id' })
  academicYear: AcademicYear;

  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ name: 'quarter_number', type: 'smallint' })
  quarterNumber: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'varchar', length: 40, default: QuarterStatus.PLANNED })
  status: QuarterStatus;
}
