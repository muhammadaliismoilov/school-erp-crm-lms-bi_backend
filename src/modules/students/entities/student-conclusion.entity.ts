import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { Student } from "./student.entity";

/** Baholash metrikasi (0–10 yoki 0–100 ko‘rsatkichlar). */
export type ConclusionMetrics = Record<string, number>;

/**
 * Tutor va psixolog xulosalari — har bir o‘quv yili uchun bitta yozuv
 * (Xulosalar va Yillik hisobot tablari).
 */
@Entity("student_conclusions")
@Index("uq_student_conclusions_year", ["studentId", "academicYearId"], {
  unique: true,
})
export class StudentConclusion extends UuidAuditEntity {
  @Column({ name: "school_id", type: "uuid", nullable: true }) schoolId?: string | null;
  @Column({ name: "filial_id", type: "uuid", nullable: true }) filialId?: string | null;

  @Column({ name: "student_id", type: "uuid" })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({ name: "academic_year_id", type: "uuid", nullable: true })
  academicYearId?: string | null;

  // --- Tutor ---
  @Column({ name: "tutor_note", type: "text", nullable: true })
  tutorNote?: string | null;

  @Column({ name: "tutor_metrics", type: "jsonb", default: () => "'{}'::jsonb" })
  tutorMetrics: ConclusionMetrics;

  // --- Psixolog ---
  @Column({ name: "psychologist_note", type: "text", nullable: true })
  psychologistNote?: string | null;

  @Column({ name: "psych_metrics", type: "jsonb", default: () => "'{}'::jsonb" })
  psychMetrics: ConclusionMetrics;
}
