import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import {
  StaffAchievementCategory,
  StaffAchievementIcon,
  StaffAchievementRank,
} from '../enums/hr.enums';
import { StaffMember } from './staff-member.entity';

/**
 * Xodim yutug'i (Yutuqlar tab) — olimpiada/sport/akademik va boshqalar.
 * O'quvchining `student_achievements` tuzilmasiga mos.
 */
@Entity('hr_staff_achievements')
@Index('idx_hr_staff_achievements_staff', ['staffMemberId'])
@Index('idx_hr_staff_achievements_category', ['category'])
export class StaffAchievement extends UuidAuditEntity {
  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, (staff) => staff.achievements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({
    type: 'enum',
    enum: StaffAchievementCategory,
    default: StaffAchievementCategory.PARTICIPATION,
  })
  category: StaffAchievementCategory;

  @Column({
    type: 'enum',
    enum: StaffAchievementRank,
    default: StaffAchievementRank.PARTICIPATION,
  })
  rank: StaffAchievementRank;

  @Column({
    type: 'enum',
    enum: StaffAchievementIcon,
    default: StaffAchievementIcon.TROPHY,
  })
  icon: StaffAchievementIcon;

  @Column({ name: 'achieved_at', type: 'date', nullable: true })
  achievedAt?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  organization?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'certificate_url', type: 'text', nullable: true })
  certificateUrl?: string | null;
}
