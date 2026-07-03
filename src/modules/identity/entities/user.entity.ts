import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import { UserGender } from '../../users/enums/user.enums';
import { Role } from './role.entity';
import { UserSession } from './user-session.entity';

@Entity('users')
@Index('uq_users_username', ['username'], { unique: true })
@Index('uq_users_pinfl', ['pinfl'], { unique: true, where: '"pinfl" IS NOT NULL' })
@Index('uq_users_document_number', ['documentNumber'], {
  unique: true,
  where: '"document_number" IS NOT NULL',
})
@Index('idx_users_gender', ['gender'])
@Index('idx_users_birth_date', ['birthDate'])
@Index('idx_users_school', ['schoolId'])
@Index('idx_users_branch', ['branchId'])
export class User extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  username: string;

  /**
   * Foydalanuvchi tegishli bo'lgan maktab (qattiq tenant chegarasi). Uno va
   * Yuton School — alohida maktablar; ular ma'lumoti hech qачон aralashmaydi.
   */
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string | null;

  /** Foydalanuvchining asosiy (default) filiali — maktab ichida. */
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId?: string | null;

  @Column({ type: 'varchar', length: 254, unique: true, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 32, unique: true, nullable: true })
  phone?: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'first_name_cyrillic', type: 'varchar', length: 80, nullable: true })
  firstNameCyrillic?: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName: string;

  @Column({ name: 'last_name_cyrillic', type: 'varchar', length: 80, nullable: true })
  lastNameCyrillic?: string | null;

  @Column({ name: 'middle_name', type: 'varchar', length: 80, nullable: true })
  middleName?: string | null;

  @Column({ name: 'middle_name_cyrillic', type: 'varchar', length: 80, nullable: true })
  middleNameCyrillic?: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: string | null;

  @Column({ name: 'document_number', type: 'varchar', length: 32, nullable: true })
  documentNumber?: string | null;

  @Column({ type: 'enum', enum: UserGender, nullable: true })
  gender?: UserGender | null;

  @Column({ type: 'varchar', length: 14, nullable: true })
  pinfl?: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  workplace?: string | null;

  @Column({ name: 'profile_image_url', type: 'varchar', length: 500, nullable: true })
  profileImageUrl?: string | null;

  @Column({ name: 'profile_image_file_id', type: 'uuid', nullable: true })
  profileImageFileId?: string | null;

  @Column({ type: 'enum', enum: CommonStatus, default: CommonStatus.ACTIVE })
  status: CommonStatus;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @Column({ name: 'profile_json', type: 'jsonb', nullable: true })
  profile?: Record<string, unknown> | null;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];
}
