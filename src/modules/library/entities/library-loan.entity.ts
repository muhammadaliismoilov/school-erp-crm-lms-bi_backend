import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

@Entity('library_loans')
@Index('idx_library_loans_copy', ['copyId'])
@Index('idx_library_loans_student', ['studentId'])
@Index('idx_library_loans_status', ['status'])
export class LibraryLoan extends UuidAuditEntity {
  @Column({ name: 'copy_id', type: 'uuid' })
  copyId: string;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId?: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid', nullable: true })
  staffMemberId?: string | null;

  @Column({ name: 'loaned_at', type: 'timestamptz' })
  loanedAt: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt?: string | null;

  @Column({ name: 'fine_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  fineAmount: number;

  @Column({ name: 'status', type: 'varchar', length: 40 })
  status: string;

}
