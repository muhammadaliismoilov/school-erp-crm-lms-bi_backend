import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('cashboxes')
@Index('uq_cashboxes_code', ['code'], { unique: true })
export class Cashbox extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'code', type: 'varchar', length: 40 })
  code: string;

  @Column({ name: 'currency', type: 'varchar', length: 10 })
  currency: string;

  @Column({ name: 'balance', type: 'numeric', precision: 14, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

}
