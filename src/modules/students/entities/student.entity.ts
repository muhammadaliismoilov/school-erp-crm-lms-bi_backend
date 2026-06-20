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
export class Student extends UuidAuditEntity {
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

  /** Chegirma foizi (0–100). */
  @Column({
    name: "discount_percent",
    type: "numeric",
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercent: number;

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

  @OneToMany(() => StudentParent, (studentParent) => studentParent.student)
  parents: StudentParent[];

  @OneToMany(() => StudentDocument, (document) => document.student)
  documents: StudentDocument[];
}
