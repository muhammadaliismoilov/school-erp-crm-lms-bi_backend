import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { SchoolClass } from "../../academic/entities/school-class.entity";
import { Gender, StudentLanguage, StudentStatus } from "../enums/student-status.enum";
import { StudentDocument } from "./student-document.entity";
import { StudentParent } from "./student-parent.entity";

/** Qo‘shimcha hujjat ro‘yxati (drawer'dagi checkboxlar). */
export interface ExtraDocumentsFlags {
  tabelGuvohnoma?: boolean;
  passportNusxa?: boolean;
  tibbiyDaftarcha?: boolean;
  rasmlar?: boolean;
  baholarVaraqasi?: boolean;
}

@Entity("students")
@Index("uq_students_student_code", ["studentCode"], { unique: true })
@Index("idx_students_current_class", ["currentClassId"])
@Index("idx_students_school", ["schoolId"])
@Index("idx_students_filial", ["filialId"])
@Index("idx_students_school_filial_created", ["schoolId", "filialId", "createdAt"])
export class Student extends UuidAuditEntity {
  /** Maktab (qattiq tenant chegarasi) — ko'p-maktabli ajratish uchun. */
  @Column({ name: "school_id", type: "uuid", nullable: true })
  schoolId?: string | null;

  /** Filial (branch) — maktab ichida. */
  @Column({ name: "filial_id", type: "uuid", nullable: true })
  filialId?: string | null;

  @Column({ name: "first_name", type: "varchar", length: 80 })
  firstName: string;

  @Column({ name: "last_name", type: "varchar", length: 80 })
  lastName: string;

  @Column({ name: "middle_name", type: "varchar", length: 80, nullable: true })
  middleName?: string | null;

  @Column({ name: "birth_date", type: "date", nullable: true })
  birthDate?: string | null;

  @Column({ type: "enum", enum: Gender, nullable: true })
  gender?: Gender | null;

  @Column({
    name: "preferred_language",
    type: "enum",
    enum: StudentLanguage,
    default: StudentLanguage.UZ,
  })
  preferredLanguage: StudentLanguage;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl?: string | null;

  @Column({ name: "student_code", type: "varchar", length: 40 })
  studentCode: string;

  @Column({ type: "enum", enum: StudentStatus, default: StudentStatus.ACTIVE })
  status: StudentStatus;

  @Column({ name: "national_id", type: "varchar", length: 32, nullable: true })
  nationalId?: string | null;

  @Column({ name: "current_class_id", type: "uuid", nullable: true })
  currentClassId?: string | null;

  @ManyToOne(() => SchoolClass, (schoolClass) => schoolClass.students, { nullable: true })
  @JoinColumn({ name: "current_class_id" })
  currentClass?: SchoolClass | null;

  /** Shartnoma raqami. */
  @Column({ name: "contract_number", type: "varchar", length: 60, nullable: true })
  contractNumber?: string | null;

  /** Chegirma foizi (0–100). Eski maydon — back-compat; yangi kod discountValue/Type ishlatadi. */
  @Column({
    name: "discount_percent",
    type: "numeric",
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercent: number;

  // --- Billing (oylik tarif + chegirma) ---

  /** O'quvchining oylik to'lov tarifi. */
  @Column({ name: "monthly_fee", type: "numeric", precision: 14, scale: 2, default: 0 })
  monthlyFee: number;

  /** Chegirma turi: foiz yoki so'mdagi qiymat. */
  @Column({ name: "discount_type", type: "varchar", length: 10, default: "percent" })
  discountType: "percent" | "amount";

  /** Chegirma qiymati — foiz (0–100) yoki so'mdagi summa (discountType ga qarab). */
  @Column({ name: "discount_value", type: "numeric", precision: 14, scale: 2, default: 0 })
  discountValue: number;

  /** To'lov hisobi boshlanish sanasi — null bo'lsa created_at oyi olinadi. */
  @Column({ name: "billing_start_date", type: "date", nullable: true })
  billingStartDate?: string | null;

  /**
   * Tanlangan to'lov rejasi: yearly_1x / split_2 / split_3 / monthly.
   * null → maktab default (monthly) — eski o'quvchilar uchun back-compat.
   */
  @Column({ name: "payment_plan", type: "varchar", length: 20, nullable: true })
  paymentPlan?: "yearly_1x" | "split_2" | "split_3" | "monthly" | null;

  /** Per-student reja chegirma override turi (null → global config'dan olinadi). */
  @Column({ name: "plan_discount_override_type", type: "varchar", length: 10, nullable: true })
  planDiscountOverrideType?: "percent" | "amount" | null;

  /** Per-student reja chegirma override qiymati (null → global config'dan). */
  @Column({ name: "plan_discount_override_value", type: "numeric", precision: 14, scale: 2, nullable: true })
  planDiscountOverrideValue?: number | null;

  // --- Manzil ---
  @Column({ type: "varchar", length: 80, nullable: true })
  region?: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  district?: string | null;

  @Column({ type: "text", nullable: true })
  address?: string | null;

  @Column({ name: "personal_phone", type: "varchar", length: 32, nullable: true })
  personalPhone?: string | null;

  /** Qiziqishlar (teglar ro‘yxati). */
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  interests: string[];

  /** Qo‘shimcha hujjat checkboxlari. */
  @Column({ name: "extra_documents", type: "jsonb", default: () => "'{}'::jsonb" })
  extraDocuments: ExtraDocumentsFlags;

  @Column({ name: "medical_notes", type: "text", nullable: true, select: false })
  medicalNotes?: string | null;

  /** Ketish/o‘chirish sababi — soft-delete paytida saqlanadi (Ketgan o‘quvchilar). */
  @Column({ name: "withdrawal_reason", type: "text", nullable: true })
  withdrawalReason?: string | null;

  @OneToMany(() => StudentParent, (studentParent) => studentParent.student)
  parents: StudentParent[];

  @OneToMany(() => StudentDocument, (document) => document.student)
  documents: StudentDocument[];
}
