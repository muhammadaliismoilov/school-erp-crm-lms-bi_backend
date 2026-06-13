import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('vendors')
@Index('idx_vendors_status', ['status'])
export class Vendor extends UuidAuditEntity {
  @Column({ name: 'name', type: 'varchar', length: 140 })
  name: string;

  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone?: string | null;

  @Column({ name: 'email', type: 'varchar', length: 120, nullable: true })
  email?: string | null;

  @Column({ name: 'tax_number', type: 'varchar', length: 50, nullable: true })
  taxNumber?: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
