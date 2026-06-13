import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";
import { SchoolClass } from "../../academic/entities/school-class.entity";
import { Gender, StudentStatus } from "../enums/student-status.enum";
import { StudentDocument } from "./student-document.entity";
import { StudentParent } from "./student-parent.entity";

@Entity("students")
@Index("uq_students_student_code", ["studentCode"], { unique: true })
@Index("idx_students_current_class", ["currentClassId"])
export class Student extends UuidAuditEntity {
  @Column({ name: "first_name", type: "varchar", length: 80 })
  firstName: string;

  @Column({ name: "last_name", type: "varchar", length: 80 })
  lastName: string;

  @Column({ name: "birth_date", type: "date", nullable: true })
  birthDate?: string | null;

  @Column({ type: "enum", enum: Gender, nullable: true })
  gender?: Gender | null;

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

  @Column({ name: "medical_notes", type: "text", nullable: true, select: false })
  medicalNotes?: string | null;

  @OneToMany(() => StudentParent, (studentParent) => studentParent.student)
  parents: StudentParent[];

  @OneToMany(() => StudentDocument, (document) => document.student)
  documents: StudentDocument[];
}
