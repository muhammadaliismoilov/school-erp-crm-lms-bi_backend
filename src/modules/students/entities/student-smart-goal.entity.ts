import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { Student } from "./student.entity";

/** SMART maqsad qatori (Kelajak rejasi jadvali). */
export interface SmartGoalItem {
  /** Barqaror identifikator (FE'da satrlarni ajratish uchun). */
  id: string;
  /** Maqsad nomi. */
  title: string;
  /** Muddat (ISO sana, ixtiyoriy). */
  deadline?: string | null;
  /** Natija / izoh. */
  result?: string | null;
}

/**
 * Kelajak rejasi (Yillik hisobot tab) — har bir o‘quv yili uchun bitta yozuv:
 * sajiya-xulq, rivojlanish, mehnat harakatlari matnlari + SMART maqsadlar.
 */
@Entity("student_smart_goals")
@Index("uq_student_smart_goals_year", ["studentId", "academicYearId"], {
  unique: true,
})
export class StudentSmartGoal extends UuidAuditEntity {
  @Column({ name: "student_id", type: "uuid" })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({ name: "academic_year_id", type: "uuid", nullable: true })
  academicYearId?: string | null;

  /** Sajiya-xulq (Sajiya-quluq). */
  @Column({ name: "character_note", type: "text", nullable: true })
  characterNote?: string | null;

  /** Rivojlanish. */
  @Column({ name: "development_note", type: "text", nullable: true })
  developmentNote?: string | null;

  /** Mehnat harakatlari. */
  @Column({ name: "work_note", type: "text", nullable: true })
  workNote?: string | null;

  /** SMART maqsadlar ro‘yxati. */
  @Column({ name: "smart_goals", type: "jsonb", default: () => "'[]'::jsonb" })
  smartGoals: SmartGoalItem[];
}
