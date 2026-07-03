import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { SchoolClass } from '../../academic/entities/school-class.entity';
import { User } from '../../identity/entities/user.entity';
import { Student } from '../../students/entities/student.entity';

/** Ota-ona turi: ona / ota / vasiy / boshqa. */
export enum ParentType {
  MOTHER = 'mother',
  FATHER = 'father',
  GUARDIAN = 'guardian',
  OTHER = 'other',
}

/** Muloqot kayfiyati (ota-ona munosabati): ijobiy / neytral / salbiy. */
export enum CommunicationSentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
}

/**
 * Xodim (tyutor/o'qituvchi) tomonidan ota-ona bilan o'tkazilgan muloqot qaydi.
 * Sentiment, ballar va maqsad/izoh saqlanadi.
 */
@Entity('parent_communications')
@Index('idx_parent_comm_sentiment', ['sentiment'])
@Index('idx_parent_comm_class', ['classId'])
@Index('idx_parent_comm_student', ['studentId'])
@Index('idx_parent_comm_date', ['communicationDate'])
export class ParentCommunication extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ name: 'class_id', type: 'uuid', nullable: true })
  classId?: string | null;

  @ManyToOne(() => SchoolClass, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class?: SchoolClass | null;

  /** Muloqot qilingan ota-ona (users, PARENT roli). */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: User | null;

  @Column({ name: 'parent_type', type: 'enum', enum: ParentType })
  parentType: ParentType;

  @Column({ type: 'enum', enum: CommunicationSentiment })
  sentiment: CommunicationSentiment;

  /** Tyutor (sinf rahbari) — users. */
  @Column({ name: 'tutor_id', type: 'uuid', nullable: true })
  tutorId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: User | null;

  /** Muloqotni qayd qilgan xodim (XODIM ustuni). */
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  /** Ta'lim bali (0–100). */
  @Column({ name: 'education_score', type: 'smallint', nullable: true })
  educationScore?: number | null;

  /** Sinf yetakchisi bali (0–100). */
  @Column({ name: 'class_leader_score', type: 'smallint', nullable: true })
  classLeaderScore?: number | null;

  /** Darsdan tashqari ball (0–100). */
  @Column({ name: 'extracurricular_score', type: 'smallint', nullable: true })
  extracurricularScore?: number | null;

  /** Tashkiliy ball (0–100). */
  @Column({ name: 'organizational_score', type: 'smallint', nullable: true })
  organizationalScore?: number | null;

  /** Maqsad. */
  @Column({ type: 'text', nullable: true })
  purpose?: string | null;

  /** Izohlar (IZOHLAR ustuni). */
  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'communication_date', type: 'timestamptz', default: () => 'now()' })
  communicationDate: Date;
}
