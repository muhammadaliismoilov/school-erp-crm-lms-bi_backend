import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

/**
 * Oylik hisoblash siyosati — har filial (yoki maktab) uchun bitta yozuv.
 * Sinf rahbarligi stavkasi va cheklovi shu yerdan boshqariladi (hardcode emas).
 */
@Entity('hr_payroll_settings')
@Index('uq_hr_payroll_settings_scope', ['schoolId', 'filialId'], { unique: true })
export class PayrollSettings extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  /** Bitta sinf rahbarligi uchun oylik qo'shimcha, so'mda (masalan 600 000). */
  @Column({ name: 'class_leader_rate', type: 'numeric', precision: 14, scale: 2, default: 0 })
  classLeaderRate: number;

  /** Bir o'qituvchi maksimal nechta sinfga rahbar bo'la oladi. */
  @Column({ name: 'max_class_leaderships', type: 'int', default: 3 })
  maxClassLeaderships: number;
}
