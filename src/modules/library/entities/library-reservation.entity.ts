import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('library_reservations')
@Index('idx_library_reservations_book', ['bookId'])
@Index('idx_library_reservations_student', ['studentId'])
export class LibraryReservation extends UuidAuditEntity {
  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId?: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid', nullable: true })
  staffMemberId?: string | null;

  @Column({ name: 'reserved_at', type: 'timestamptz' })
  reservedAt: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
