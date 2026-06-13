import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('library_books')
@Index('idx_library_books_isbn', ['isbn'])
export class LibraryBook extends UuidAuditEntity {
  @Column({ name: 'title', type: 'varchar', length: 180 })
  title: string;

  @Column({ name: 'author', type: 'varchar', length: 140, nullable: true })
  author?: string | null;

  @Column({ name: 'isbn', type: 'varchar', length: 40, nullable: true })
  isbn?: string | null;

  @Column({ name: 'category', type: 'varchar', length: 80, nullable: true })
  category?: string | null;

  @Column({ name: 'publisher', type: 'varchar', length: 120, nullable: true })
  publisher?: string | null;

  @Column({ name: 'published_year', type: 'int', nullable: true })
  publishedYear?: number | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

}
