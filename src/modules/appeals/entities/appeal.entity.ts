import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

export enum AppealType {
  SUGGESTION = 'suggestion',
  COMPLAINT = 'complaint',
}

export enum AppealSource {
  MANUAL = 'manual',
  PUBLIC_LINK = 'public_link',
  SYSTEM = 'system',
}

export enum AppealStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum TargetRole {
  CLASS_TEACHER = 'class_teacher',
  DEPUTY_DIRECTOR = 'deputy_director',
  DIRECTOR = 'director',
  ACCOUNTANT = 'accountant',
  SALES_MANAGER = 'sales_manager',
  PSYCHOLOGIST = 'psychologist',
  DOCTOR = 'doctor',
  LIBRARIAN = 'librarian',
}

/**
 * Indekslar so'rov naqshiga qarab tanlangan (10-bob: tenglik ustunlari oldinga,
 * diapazon/tartib oxirga). `idx_appeals_inbox` da `created_at` DESC — bu yerda
 * ifodalanmaydi (TypeORM `@Index` yo'nalishni bilmaydi), migratsiyada esa
 * DESC bilan yaratilgan; TypeORM indeksni nom + ustunlar bo'yicha taqqoslagani
 * uchun bu farq `migration:generate` da churn hosil qilmaydi.
 */
@Entity('appeals')
@Index('idx_appeals_inbox', ['schoolId', 'status', 'createdAt'])
@Index('idx_appeals_assignee_scope', ['schoolId', 'assigneeUserId'])
export class Appeal extends UuidAuditEntity {
  /** Qattiq tenant chegarasi — bazada NOT NULL + FK (ON DELETE RESTRICT). */
  @Column({ name: 'school_id', type: 'uuid', nullable: false }) schoolId: string;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  /**
   * Murojaat qaysi public havoladan kelgani. Havolasiz (qo'lda kiritilgan)
   * murojaatda `null`. Bu bog'lanish saqlanmagani uchun ilgari egasiz qolgan
   * qatorni qaysi maktabga tiklashni aniqlashning yo'li yo'q edi.
   */
  @Column({ name: 'public_link_id', type: 'uuid', nullable: true })
  publicLinkId?: string | null;

  /**
   * Anonim murojaatda `full_name`/`phone` bo'sh qoladi. Oraliq holatni
   * (masalan ism bor, telefon yo'q) `chk_appeals_identity` taqiqlaydi.
   */
  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  @Column({ name: 'full_name', type: 'varchar', length: 150, nullable: true })
  fullName?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({
    type: 'enum',
    enum: AppealType,
    nullable: false,
  })
  type: AppealType;

  @Column({
    name: 'target_role',
    type: 'enum',
    enum: TargetRole,
    nullable: false,
  })
  targetRole: TargetRole;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({
    type: 'enum',
    enum: AppealSource,
    default: AppealSource.PUBLIC_LINK,
    nullable: false,
  })
  source: AppealSource;

  @Column({
    type: 'enum',
    enum: AppealStatus,
    default: AppealStatus.PENDING,
    nullable: false,
  })
  status: AppealStatus;

  /** User the appeal is assigned to for handling. Null until an admin assigns it. */
  @Column({ name: 'assignee_user_id', type: 'uuid', nullable: true })
  assigneeUserId?: string | null;

  /** Mandatory explanation captured when an appeal is resolved or rejected. */
  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote?: string | null;

  /** User who moved the appeal into a terminal (resolved/rejected) state. */
  @Column({ name: 'resolved_by_id', type: 'uuid', nullable: true })
  resolvedById?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  /**
   * Javob berish muddati: shikoyat uchun 3 kun, taklif uchun 7 kun.
   *
   * GENERATED ustun BO'LA OLMAYDI — `timestamptz + interval` STABLE, IMMUTABLE
   * emas ("generation expression is not immutable"). Shuning uchun service
   * to'ldiradi (`resolveDueAt`), tur o'zgarsa qayta hisoblanadi.
   */
  @Column({ name: 'due_at', type: 'timestamptz', nullable: false })
  dueAt: Date;
}
