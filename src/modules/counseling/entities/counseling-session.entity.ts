import { Column, Entity, Index } from "typeorm";
import { UuidAuditEntity } from "../../../common/entities/abstract.entity";

/**
 * Psychologist counseling session. The clinical notes are stored only as
 * `notes_encrypted` (AES-256-GCM ciphertext) and are never persisted in
 * plaintext. Read access is gated to the PSYCHOLOGIST role at the controller.
 */
@Entity("counseling_sessions")
@Index("idx_counseling_sessions_student", ["studentId"])
@Index("idx_counseling_sessions_counselor", ["counselorId"])
@Index("idx_counseling_sessions_school_date", ["schoolId", "sessionDate"])
export class CounselingSession extends UuidAuditEntity {
  /** Ko'p-maktabli ajratish (tenant). */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  @Column({ name: 'filial_id', type: 'uuid', nullable: true })
  filialId?: string | null;

  @Column({ name: "student_id", type: "uuid" })
  studentId: string;

  @Column({ name: "counselor_id", type: "uuid" })
  counselorId: string;

  @Column({ name: "session_date", type: "timestamptz" })
  sessionDate: string;

  @Column({ name: "session_type", type: "varchar", length: 40 })
  sessionType: string;

  @Column({ name: "notes_encrypted", type: "text" })
  notesEncrypted: string;

  @Column({ name: "risk_level", type: "varchar", length: 20, nullable: true })
  riskLevel?: string | null;

  @Column({ name: "follow_up_date", type: "date", nullable: true })
  followUpDate?: string | null;
}
