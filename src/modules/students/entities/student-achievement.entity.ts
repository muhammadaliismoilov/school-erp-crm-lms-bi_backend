import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import {
  AchievementCategory,
  AchievementIcon,
  AchievementRank,
} from "../enums/achievement.enum";
import { Student } from "./student.entity";

/**
 * O‘quvchi yutug‘i (Yutuqlar tab) — olimpiada/sport/akademik va boshqalar.
 */
@Entity("student_achievements")
@Index("idx_student_achievements_student", ["studentId"])
@Index("idx_student_achievements_category", ["category"])
export class StudentAchievement extends UuidAuditEntity {
  @Column({ name: "school_id", type: "uuid", nullable: true }) schoolId?: string | null;
  @Column({ name: "filial_id", type: "uuid", nullable: true }) filialId?: string | null;

  @Column({ name: "student_id", type: "uuid" })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({
    type: "enum",
    enum: AchievementCategory,
    default: AchievementCategory.PARTICIPATION,
  })
  category: AchievementCategory;

  @Column({
    type: "enum",
    enum: AchievementRank,
    default: AchievementRank.PARTICIPATION,
  })
  rank: AchievementRank;

  @Column({
    type: "enum",
    enum: AchievementIcon,
    default: AchievementIcon.TROPHY,
  })
  icon: AchievementIcon;

  @Column({ name: "achieved_at", type: "date", nullable: true })
  achievedAt?: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  organization?: string | null;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ name: "certificate_url", type: "text", nullable: true })
  certificateUrl?: string | null;
}
