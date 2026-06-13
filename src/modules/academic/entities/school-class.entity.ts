import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { User } from "../../identity/entities/user.entity";
import { Room } from "../../settings/entities/room.entity";
import { Student } from "../../students/entities/student.entity";
import { AcademicYear } from "./academic-year.entity";

@Entity("classes")
@Index("idx_classes_name_year", ["name", "academicYearId"])
@Index("uq_classes_year_grade_section_active", ["academicYearId", "gradeLevel", "section"], {
  unique: true,
  where: "deleted_at IS NULL",
})
export class SchoolClass extends UuidAuditEntity {
  @Column({ type: "varchar", length: 80 })
  name: string;

  @Column({ name: "grade_level", type: "smallint", default: 1 })
  gradeLevel: number;

  @Column({ type: "varchar", length: 4, default: "A" })
  section: string;

  @Column({ name: "class_type", type: "varchar", length: 80, nullable: true })
  classType?: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  shift?: string | null;

  @Column({ type: "varchar", length: 20, default: "uz" })
  language: string;

  @Column({ type: "int", default: 30 })
  capacity: number;

  @Column({ name: "room_id", type: "uuid", nullable: true })
  roomId?: string | null;

  @ManyToOne(() => Room, { nullable: true })
  @JoinColumn({ name: "room_id" })
  room?: Room | null;

  @Column({ name: "curator_id", type: "uuid", nullable: true })
  curatorId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "curator_id" })
  curator?: User | null;

  @Column({ name: "academic_year_id", type: "uuid" })
  academicYearId: string;

  @ManyToOne(() => AcademicYear, { nullable: false })
  @JoinColumn({ name: "academic_year_id" })
  academicYear: AcademicYear;

  @OneToMany(() => Student, (student) => student.currentClass)
  students: Student[];
}
