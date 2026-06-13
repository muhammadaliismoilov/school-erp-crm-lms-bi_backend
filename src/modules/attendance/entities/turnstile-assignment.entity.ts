import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { PersonType } from '../../../common/enums/person-type.enum';

@Entity('turnstile_assignments')
@Index('idx_turnstile_person', ['personType', 'personId'])
export class TurnstileAssignment extends UuidAuditEntity {
  @Column({ name: 'person_type', type: 'enum', enum: PersonType })
  personType: PersonType;

  @Column({ name: 'person_id', type: 'uuid' })
  personId: string;

  @Column({ name: 'device_number', type: 'varchar', length: 80 })
  deviceNumber: string;

  @Column({ name: 'entry_code', type: 'varchar', length: 120 })
  entryCode: string;

  @Column({ name: 'exit_code', type: 'varchar', length: 120, nullable: true })
  exitCode?: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
