import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { PersonType } from '../../../common/enums/person-type.enum';

/**
 * Turniketdan o'tish xom hodisasi (o'zgarmas oqim). FaceID/karta orqali
 * aniqlangan har bir kirish/chiqish shu yerga yoziladi. Bu jadval faktik
 * manba — undan kunlik davomat (AttendanceRecord) va dars davomati proyeksiya
 * qilinadi. Takror-himoya `idempotency_key` unique indeksi orqali.
 */
@Entity('attendance_logs')
@Index('idx_attendance_logs_person_time', ['personType', 'personId', 'timestamp'])
@Index('uq_attendance_logs_idempotency', ['idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
export class AttendanceLog extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'person_type', type: 'enum', enum: PersonType })
  personType: PersonType;

  @Column({ name: 'person_id', type: 'uuid' })
  personId: string;

  /** Hodisa qurilmada ro'y bergan vaqt (device time). */
  @Column({ type: 'timestamptz' })
  timestamp: Date;

  /** Server hodisani qabul qilgan vaqt (oflayn buferdan kechikib kelishi mumkin). */
  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt?: Date | null;

  @Column({ type: 'varchar', length: 20 })
  direction: 'in' | 'out';

  @Column({ name: 'device_number', type: 'varchar', length: 80 })
  deviceNumber: string;

  /**
   * Takror-himoya kaliti. Qurilma bergan bo'lsa o'sha, aks holda
   * `device:code:direction:capturedAt` dan hosil qilinadi. Unique.
   */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 200, nullable: true })
  idempotencyKey?: string | null;

  /** FaceID moslik ishonch darajasi (0–100). Past qiymatlar qo'lda tekshiriladi. */
  @Column({ name: 'face_match_confidence', type: 'real', nullable: true })
  faceMatchConfidence?: number | null;

  /** Qurilma yuborgan xom yuk (debug/audit uchun). */
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload?: Record<string, unknown> | null;
}
