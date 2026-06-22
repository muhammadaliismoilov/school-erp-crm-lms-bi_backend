import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { User } from "../../identity/entities/user.entity";
import { Student } from "./student.entity";

@Entity("student_parents")
@Index("uq_student_parent_relation", ["studentId", "parentId"], {
  unique: true,
})
export class StudentParent extends UuidAuditEntity {
  @Column({ name: "student_id", type: "uuid" })
  studentId: string;

  @ManyToOne(() => Student, (student) => student.parents, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "student_id" })
  student: Student;

  /** References a `users` row carrying the PARENT role. */
  @Column({ name: "parent_id", type: "uuid" })
  parentId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "parent_id" })
  parent: User;

  @Column({ type: "varchar", length: 40 })
  relation: string;

  @Column({ name: "is_primary", type: "boolean", default: false })
  isPrimary: boolean;
}
