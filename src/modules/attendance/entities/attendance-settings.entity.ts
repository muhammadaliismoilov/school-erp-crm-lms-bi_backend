import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

/**
 * Davomat siyosati sozlamalari — har filial (yoki maktab) uchun bitta yozuv.
 * Kechikish chegarasi, o'qituvchi tuzatish oynasi va notifikatsiya
 * yoqilgan/o'chirilgan hodisalar shu yerdan boshqariladi (hardcode emas).
 */
@Entity('attendance_settings')
@Index('uq_attendance_settings_scope', ['schoolId', 'filialId'], { unique: true })
export class AttendanceSettings extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  /** Dars boshlangandan keyin necha daqiqa o'tsa "kechikdi" hisoblanadi. */
  @Column({ name: 'late_threshold_minutes', type: 'int', default: 5 })
  lateThresholdMinutes: number;

  /**
   * Sessiya davomati saqlangandan keyin o'qituvchi qancha vaqt (daqiqa) ichida
   * tuzatishi/kechikkan o'quvchini qo'shishi mumkin. 0 => faqat admin tuzatadi.
   */
  @Column({ name: 'correction_window_minutes', type: 'int', default: 720 })
  correctionWindowMinutes: number;

  /** Turniketdan kirganda ota-onaga xabar yuborilsinmi. */
  @Column({ name: 'notify_on_entry', type: 'boolean', default: true })
  notifyOnEntry: boolean;

  /** Maktabdan chiqib ketganda xabar yuborilsinmi. */
  @Column({ name: 'notify_on_exit', type: 'boolean', default: true })
  notifyOnExit: boolean;

  /** Dars/kurs davomati (keldi/kechikdi/yo'q) bo'yicha xabar yuborilsinmi. */
  @Column({ name: 'notify_on_session', type: 'boolean', default: true })
  notifyOnSession: boolean;

  /** Tinch soatlar boshlanishi (shu oraliqda xabar navbatda kutadi). */
  @Column({ name: 'quiet_hours_start', type: 'time', nullable: true })
  quietHoursStart?: string | null;

  /** Tinch soatlar tugashi. */
  @Column({ name: 'quiet_hours_end', type: 'time', nullable: true })
  quietHoursEnd?: string | null;
}
