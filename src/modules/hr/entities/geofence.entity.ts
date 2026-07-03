import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

/**
 * Geofence (lokatsiya) — davomat uchun ruxsat etilgan hudud. "Lokatsiyalar"
 * sahifasida boshqariladi; hozircha minimal — Lakatsiya feature'i kengaytiradi.
 */
@Entity('hr_geofences')
@Index('uq_hr_geofences_name_active', ['name'], { unique: true, where: 'deleted_at IS NULL' })
export class Geofence extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: number | null;

  /** Ruxsat etilgan radius (metr). */
  @Column({ name: 'radius_m', type: 'integer', nullable: true })
  radiusM?: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
