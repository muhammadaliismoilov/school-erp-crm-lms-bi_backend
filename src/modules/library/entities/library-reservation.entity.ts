import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('library_reservations')
@Index('idx_library_reservations_book', ['bookId'])
@Index('idx_library_reservations_student', ['studentId'])
export class LibraryReservation extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

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
