import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('rooms')
@Index('uq_rooms_normalized_number_active', ['normalizedRoomNumber'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('idx_rooms_floor_active', ['floor'], { where: 'deleted_at IS NULL' })
export class Room extends UuidAuditEntity {
  @Column({ name: 'room_number', type: 'varchar', length: 32 })
  roomNumber: string;

  @Column({ name: 'room_number_normalized', type: 'varchar', length: 32 })
  normalizedRoomNumber: string;

  @Column({ type: 'smallint' })
  floor: number;
}
