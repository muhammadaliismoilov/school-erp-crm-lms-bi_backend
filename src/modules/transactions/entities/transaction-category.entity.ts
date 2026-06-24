import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

/** Kategoriya qaysi tranzaksiya turiga tegishli ekanini cheklaydi. */
export enum TransactionCategoryKind {
  INCOME = 'income',
  EXPENSE = 'expense',
  BOTH = 'both',
}

/**
 * To'lov maqsadi / kategoriya (O'quvchi to'lovi, Maosh, Ijara ...).
 * `parentId` orqali ierarxiya: ota tugun = "Umumiy kategoriya",
 * bola tugun = "Aniq kategoriya". `kind` kirim/chiqim/ikkalasini cheklaydi.
 */
@Entity('transaction_categories')
@Index('idx_tx_categories_kind', ['kind'])
@Index('idx_tx_categories_parent', ['parentId'])
export class TransactionCategory extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'enum', enum: TransactionCategoryKind, default: TransactionCategoryKind.BOTH })
  kind: TransactionCategoryKind;

  /** Umumiy kategoriya (ota tugun). Null bo'lsa o'zi umumiy hisoblanadi. */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => TransactionCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: TransactionCategory | null;

  /** O'quvchi to'lovi kabi maxsus oqim uchun belgi (boyitilgan forma). */
  @Column({ name: 'is_student_tuition', type: 'boolean', default: false })
  isStudentTuition: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;
}
