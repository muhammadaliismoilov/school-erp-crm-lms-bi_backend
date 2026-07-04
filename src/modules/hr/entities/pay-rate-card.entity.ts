import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { QualificationCategory } from '../enums/hr.enums';

/**
 * Toifa bo'yicha dars (soat) stavkasi jadvali — payroll dvigatelining yagona
 * stavka manbasi. Stavkalar kodga yozilmaydi: har o'zgarish yangi yozuv
 * (`effectiveFrom` bilan) bo'ladi, eski davr oyliklari eski stavka bilan
 * qayta hisoblanaveradi (tarixiylik).
 */
@Entity('hr_pay_rate_cards')
@Index('idx_hr_pay_rate_cards_scope', ['schoolId', 'filialId', 'category', 'effectiveFrom'])
export class PayRateCard extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  /** Malaka toifasi (StaffMember.qualificationCategory bilan yagona enum). */
  @Column({ type: 'enum', enum: QualificationCategory })
  category: QualificationCategory;

  /** Bitta dars (akademik soat) uchun stavka, so'mda. */
  @Column({ name: 'rate_per_lesson', type: 'numeric', precision: 14, scale: 2 })
  ratePerLesson: number;

  /** Shu sanadan boshlab amal qiladi (shu sana kiradi). */
  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
