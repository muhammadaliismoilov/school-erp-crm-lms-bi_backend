import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { SchoolClass } from "../../academic/entities/school-class.entity";
import { Subject } from "../../academic/entities/subject.entity";
import { ExamStatus } from "../enums/lms.enums";
import { ExamResult } from "./exam-result.entity";

@Entity("lms_exams")
@Index("idx_lms_exams_class", ["classId"])
@Index("idx_lms_exams_date", ["examDate"])
export class Exam extends UuidAuditEntity {
  @Column({ type: "varchar", length: 120 }) title: string;
  @Column({ name: "class_id", type: "uuid" }) classId: string;
  @ManyToOne(() => SchoolClass, { onDelete: "CASCADE" })
  @JoinColumn({ name: "class_id" })
  class: SchoolClass;
  @Column({ name: "subject_id", type: "uuid" }) subjectId: string;
  @ManyToOne(() => Subject, { onDelete: "CASCADE" })
  @JoinColumn({ name: "subject_id" })
  subject: Subject;
  @Column({ name: "exam_date", type: "date" }) examDate: string;
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
