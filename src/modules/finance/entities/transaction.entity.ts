import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { PaymentType } from "../../transactions/entities/payment-type.entity";
import { TransactionCategory } from "../../transactions/entities/transaction-category.entity";
import { BankAccount } from "./bank-account.entity";

/**
 * Moliyaviy tranzaksiya (kirim / chiqim). UI orqali qo'lda kiritilganda
 * `sourceType='manual'` bo'ladi; boshqa modullar (shartnoma to'lovi va h.k.)
 * o'z `sourceType`/`sourceId` qiymatlari bilan yozadi.
 */
@Entity("transactions")
@Index("idx_transactions_type", ["type"])
@Index("idx_transactions_date", ["date"])
@Index("idx_transactions_person", ["personId"])
@Index("idx_transactions_category", ["purposeCategoryId"])
export class FinanceTransaction extends UuidAuditEntity {
  @Column({
    name: "source_type",
    type: "varchar",
    length: 80,
    default: "manual",
  })
  sourceType: string;

  @Column({ name: "source_id", type: "uuid", nullable: true })
  sourceId?: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  amount: number;

  @Column({ type: "date" })
  date: string;

  @Column({ type: "varchar", length: 20 })
  type: "income" | "expense";

  /** Eski tekstli to'lov usuli (back-compat). Yangi UI `paymentTypeId` ishlatadi. */
  @Column({ type: "varchar", length: 40, nullable: true })
  method?: string | null;

  @Column({ name: "bank_account_id", type: "uuid", nullable: true })
  bankAccountId?: string | null;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: "bank_account_id" })
  bankAccount?: BankAccount | null;

  // ─── Tranzaksiyalar moduli (UI) maydonlari ──────────────────────────────

  /** To'lov maqsadi / kategoriya. */
  @Column({ name: "purpose_category_id", type: "uuid", nullable: true })
  purposeCategoryId?: string | null;

  @ManyToOne(() => TransactionCategory, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "purpose_category_id" })
  purposeCategory?: TransactionCategory | null;

  /** To'lov turi (Naqd, Plastik ...). */
  @Column({ name: "payment_type_id", type: "uuid", nullable: true })
  paymentTypeId?: string | null;

  @ManyToOne(() => PaymentType, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "payment_type_id" })
  paymentType?: PaymentType | null;

  /** Shaxs (foydalanuvchi) — to'lovni qilgan/olgan. Snapshot ism saqlanadi. */
  @Column({ name: "person_id", type: "uuid", nullable: true })
  personId?: string | null;

  @Column({ name: "person_name", type: "varchar", length: 160, nullable: true })
  personName?: string | null;

  @Column({ name: "person_role", type: "varchar", length: 60, nullable: true })
  personRole?: string | null;

  /** To'lov tegishli oy (1–12) va yil. */
  @Column({ type: "smallint", nullable: true })
  month?: number | null;

  @Column({ type: "smallint", nullable: true })
  year?: number | null;

  @Column({ type: "text", nullable: true })
  note?: string | null;

  /** To'lov cheki — yuklangan fayl IDsi. */
  @Column({ name: "receipt_file_id", type: "uuid", nullable: true })
  receiptFileId?: string | null;

  // ─── Boyitilgan o'quvchi-to'lov varianti ────────────────────────────────

  @Column({
    name: "discount_percent",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  discountPercent?: number | null;

  /** Chegirmagacha bo'lgan asl narx. */
  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  price?: number | null;

  @Column({ name: "class_id", type: "uuid", nullable: true })
  classId?: string | null;

  @Column({ name: "student_id", type: "uuid", nullable: true })
  studentId?: string | null;

  // ─── Egalik auditi: kim yaratdi / kim oxirgi o'zgartirdi (snapshot) ──────────

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy?: string | null;

  @Column({
    name: "created_by_name",
    type: "varchar",
    length: 160,
    nullable: true,
  })
  createdByName?: string | null;

  @Column({
    name: "created_by_role",
    type: "varchar",
    length: 60,
    nullable: true,
  })
  createdByRole?: string | null;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy?: string | null;

  @Column({
    name: "updated_by_name",
    type: "varchar",
    length: 160,
    nullable: true,
  })
  updatedByName?: string | null;

  @Column({
    name: "updated_by_role",
    type: "varchar",
    length: 60,
    nullable: true,
  })
  updatedByRole?: string | null;
}
