import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { Course } from "../../academic/entities/course.entity";
import { Quarter } from "../../academic/entities/quarter.entity";
import { SchoolClass } from "../../academic/entities/school-class.entity";
import { Subject } from "../../academic/entities/subject.entity";
import { User } from "../../identity/entities/user.entity";
import { ExamKind, ExamStatus, ExamType } from "../enums/lms.enums";
import { ExamResult } from "./exam-result.entity";

/**
 * Progress imtihoni — ham sinf (class) ham kurs (course) rejimini qo'llaydi.
 *  - `examKind = class`  → classId + subjectId + teacherId to'ldiriladi.
 *  - `examKind = course` → courseId to'ldiriladi (fan/o'qituvchi kursdan olinadi).
 */
@Entity("lms_exams")
@Index("idx_lms_exams_class", ["classId"])
@Index("idx_lms_exams_course", ["courseId"])
@Index("idx_lms_exams_quarter", ["quarterId"])
@Index("idx_lms_exams_kind", ["examKind"])
@Index("idx_lms_exams_status", ["status"])
@Index("idx_lms_exams_date", ["examDate"])
export class Exam extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ type: "varchar", length: 160 }) title: string;

  @Column({ name: "exam_kind", type: "enum", enum: ExamKind, default: ExamKind.CLASS })
  examKind: ExamKind;

  @Column({ name: "exam_type", type: "enum", enum: ExamType, default: ExamType.TEST })
  examType: ExamType;

  // ---- Sinf imtihoni maydonlari (examKind = class) ----
  @Column({ name: "class_id", type: "uuid", nullable: true }) classId?: string | null;
  @ManyToOne(() => SchoolClass, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "class_id" })
  class?: SchoolClass | null;

  @Column({ name: "subject_id", type: "uuid", nullable: true }) subjectId?: string | null;
  @ManyToOne(() => Subject, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "subject_id" })
  subject?: Subject | null;

  @Column({ name: "teacher_id", type: "uuid", nullable: true }) teacherId?: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "teacher_id" })
  teacher?: User | null;

  // ---- Kurs imtihoni maydonlari (examKind = course) ----
  @Column({ name: "course_id", type: "uuid", nullable: true }) courseId?: string | null;
  @ManyToOne(() => Course, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id" })
  course?: Course | null;

  // ---- Umumiy maydonlar ----
  @Column({ name: "quarter_id", type: "uuid", nullable: true }) quarterId?: string | null;
  @ManyToOne(() => Quarter, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "quarter_id" })
  quarter?: Quarter | null;

  @Column({ name: "exam_date", type: "date" }) examDate: string;

  /** Natija kiritish oynasi (vaqt oralig'i). */
  @Column({ name: "available_from", type: "timestamptz", nullable: true })
  availableFrom?: Date | null;
  @Column({ name: "available_until", type: "timestamptz", nullable: true })
  availableUntil?: Date | null;

  @Column({
    name: "max_score",
    type: "numeric",
    precision: 8,
    scale: 2,
    default: 100,
  })
  maxScore: number;

  @Column({ type: "enum", enum: ExamStatus, default: ExamStatus.DRAFT })
  status: ExamStatus;

  @OneToMany(() => ExamResult, (result) => result.exam) results: ExamResult[];
}
