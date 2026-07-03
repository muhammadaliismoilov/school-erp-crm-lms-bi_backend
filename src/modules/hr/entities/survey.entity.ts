import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { SurveyStatus, SurveyType } from '../enums/hr.enums';

/** HR "So'rovnomalar" — xodimlar uchun so'rovnomalar. */
@Entity('hr_surveys')
@Index('idx_hr_surveys_status', ['status'])
export class Survey extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'enum', enum: SurveyType, default: SurveyType.ANONYMOUS })
  type: SurveyType;

  @Column({ type: 'enum', enum: SurveyStatus, default: SurveyStatus.DRAFT })
  status: SurveyStatus;

  @Column({ name: 'is_anonymous', type: 'boolean', default: true })
  isAnonymous: boolean;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;
}
