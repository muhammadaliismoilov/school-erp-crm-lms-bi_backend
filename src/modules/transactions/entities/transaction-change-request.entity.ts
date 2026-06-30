import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { FinanceTransaction } from '../../finance/entities/transaction.entity';

/** So'rov turi: tranzaksiyani tahrirlash yoki o'chirish. */
export enum TransactionChangeRequestType {
  UPDATE = 'update',
  DELETE = 'delete',
}

/** So'rov holati: kutilmoqda → tasdiqlangan / rad etilgan. */
export enum TransactionChangeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Tranzaksiya o'zgartirish so'rovi. Yozuv egasidan boshqa xodim tranzaksiyani
 * tahrirlash yoki o'chirish uchun so'rov yuboradi; moliya rahbari ko'rib chiqib
 * tasdiqlaydi (o'zgarish tranzaksiyaga qo'llanadi) yoki rad etadi.
 *
 * Tasdiqlash vaqtida tranzaksiya o'zgargan/o'chirilgan bo'lishi mumkin bo'lgani
 * uchun so'rov yaratilgan paytdagi holat (`tx*` snapshot) saqlanadi.
 */
@Entity('transaction_change_requests')
@Index('idx_tcr_status', ['status'])
@Index('idx_tcr_type', ['requestType'])
@Index('idx_tcr_transaction', ['transactionId'])
@Index('idx_tcr_created', ['createdAt'])
export class TransactionChangeRequest extends UuidAuditEntity {
  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId?: string | null;

  @ManyToOne(() => FinanceTransaction, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: FinanceTransaction | null;

  @Column({ name: 'request_type', type: 'enum', enum: TransactionChangeRequestType })
  requestType: TransactionChangeRequestType;

  /** Tahrirlash so'rovida taklif qilingan yangi qiymatlar (partial). Delete'da null. */
  @Column({ name: 'proposed_changes', type: 'jsonb', nullable: true })
  proposedChanges?: Record<string, unknown> | null;

  // ─── Tranzaksiya snapshot'i (so'rov yaratilgan paytda) ─────────────────────

  @Column({ name: 'tx_type', type: 'varchar', length: 20, nullable: true })
  txType?: string | null;

  @Column({ name: 'tx_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  txAmount?: number | null;

  @Column({ name: 'tx_date', type: 'date', nullable: true })
  txDate?: string | null;

  @Column({ name: 'tx_person_name', type: 'varchar', length: 160, nullable: true })
  txPersonName?: string | null;

  // ─── So'rov ─────────────────────────────────────────────────────────────

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: TransactionChangeRequestStatus, default: TransactionChangeRequestStatus.PENDING })
  status: TransactionChangeRequestStatus;

  @Column({ name: 'requested_by_id', type: 'uuid', nullable: true })
  requestedById?: string | null;

  @Column({ name: 'requested_by_name', type: 'varchar', length: 160, nullable: true })
  requestedByName?: string | null;

  // ─── Ko'rib chiqish ─────────────────────────────────────────────────────

  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById?: string | null;

  @Column({ name: 'reviewed_by_name', type: 'varchar', length: 160, nullable: true })
  reviewedByName?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  /** Ko'rib chiqishdagi izoh (rad etish sababi yoki tasdiq izohi). */
  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string | null;

  /** Tasdiqlanib, tranzaksiyaga qo'llanganligi. */
  @Column({ type: 'boolean', default: false })
  applied: boolean;
}
