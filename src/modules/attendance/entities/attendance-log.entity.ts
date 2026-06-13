import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { PersonType } from '../../../common/enums/person-type.enum';

@Entity('attendance_logs')
@Index('idx_attendance_logs_person_time', ['personType', 'personId', 'timestamp'])
export class AttendanceLog extends UuidAuditEntity {
  @Column({ name: 'person_type', type: 'enum', enum: PersonType })
  personType: PersonType;

  @Column({ name: 'person_id', type: 'uuid' })
  personId: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'varchar', length: 20 })
  direction: 'in' | 'out';

  @Column({ name: 'device_number', type: 'varchar', length: 80 })
  deviceNumber: string;
}
