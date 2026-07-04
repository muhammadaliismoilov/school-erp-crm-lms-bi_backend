import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

/**
 * Ish kalendari — bayram/dam olish kunlari. Payroll dvigateli oklad xodim
 * uchun "oydagi ish kunlari"ni hisoblashda yakshanba + shu jadvaldan
 * foydalanadi (kunlik stavka = oylik ÷ ish kunlari).
 */
@Entity('hr_holidays')
@Index('idx_hr_holidays_date', ['date'])
export class Holiday extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;
}
