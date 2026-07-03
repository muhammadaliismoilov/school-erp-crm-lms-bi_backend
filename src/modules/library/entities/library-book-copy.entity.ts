import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('library_book_copies')
@Index('uq_library_book_copies_barcode', ['barcode'], { unique: true })
@Index('idx_library_book_copies_book', ['bookId'])
export class LibraryBookCopy extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @Column({ name: 'barcode', type: 'varchar', length: 80 })
  barcode: string;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

  @Column({ name: 'location', type: 'varchar', length: 120, nullable: true })
  location?: string | null;

}
