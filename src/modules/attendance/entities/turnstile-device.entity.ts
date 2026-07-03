import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { TurnstileDirection } from '../../../common/enums/turnstile-direction.enum';

/**
 * Ro'yxatdan o'tgan turniket qurilmasi. Ingestion (hodisa qabul qilish)
 * endpoint'i shu jadval orqali autentifikatsiya qilinadi va hodisaga tegishli
 * maktab/filial (tenant) aynan qurilmadan aniqlanadi — chunki qurilma
 * so'rovida foydalanuvchi JWT'si bo'lmaydi.
 */
@Entity('turnstile_devices')
@Index('uq_turnstile_devices_number', ['deviceNumber'], { unique: true })
export class TurnstileDevice extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant) — qurilma qaysi maktab/filialga tegishli. */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  /** Qurilmaning noyob raqami/identifikatori (hodisalarda ishlatiladi). */
  @Column({ name: 'device_number', type: 'varchar', length: 80 })
  deviceNumber: string;

  /** Inson o'qiy oladigan nom (masalan "Asosiy kirish 1"). */
  @Column({ type: 'varchar', length: 160, nullable: true })
  name?: string | null;

  /** API kalitining SHA-256 hash'i (ochiq kalit hech qachon saqlanmaydi). */
  @Column({ name: 'api_key_hash', type: 'varchar', length: 64 })
  apiKeyHash: string;

  /** Qurilma yo'nalishi (in/out/both). */
  @Column({ name: 'direction', type: 'enum', enum: TurnstileDirection, default: TurnstileDirection.BOTH })
  direction: TurnstileDirection;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  /** Oxirgi marta hodisa yuborgan vaqt (monitoring uchun). */
  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt?: Date | null;
}
