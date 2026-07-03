import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('lesson_periods')
@Index('uq_lesson_periods_code_active', ['code'], { unique: true, where: 'deleted_at IS NULL' })
@Index('uq_lesson_periods_order_active', ['order'], { unique: true, where: 'deleted_at IS NULL' })
export class LessonPeriod extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  order: number;
}
