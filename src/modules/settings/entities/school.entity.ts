import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { CommonStatus } from '../../../common/enums/common-status.enum';
import type { LocalizedText } from '../../../common/i18n/locale';
import {
  PaymentPeriodUnit,
  PaymentStartStrategy,
  SchoolType,
  WorkDays,
} from '../../schools/enums/school.enums';
import { Branch } from './branch.entity';

@Entity('schools')
@Index('uq_schools_normalized_name_active', ['normalizedName'], {
  unique: true,
  where: '"deleted_at" IS NULL AND "normalized_name" IS NOT NULL',
})
@Index('idx_schools_type_status', ['schoolType', 'status'])
export class School extends UuidAuditEntity {
  @Column({ type: 'jsonb' })
  name: LocalizedText;

  @Column({ name: 'normalized_name', type: 'varchar', length: 180, nullable: true })
  normalizedName?: string | null;

  @Column({ name: 'legal_name', type: 'varchar', length: 255, nullable: true })
  legalName?: string | null;

  @Column({ type: 'varchar', length: 2, default: 'UZ' })
  country?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  region?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  district?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ name: 'website_url', type: 'varchar', length: 255, nullable: true })
  websiteUrl?: string | null;

  @Column({ name: 'school_type', type: 'varchar', length: 40, default: SchoolType.GENERAL })
  schoolType?: SchoolType;

  @Column({ name: 'contact_email', type: 'varchar', length: 254, nullable: true })
  contactEmail?: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 32, nullable: true })
  contactPhone?: string | null;

  @Column({ name: 'monthly_payment', type: 'integer', default: 0 })
  monthlyPayment?: number;

  @Column({
    name: 'payment_start_strategy',
    type: 'varchar',
    length: 40,
    default: PaymentStartStrategy.FULL_ACADEMIC_YEAR,
  })
  paymentStartStrategy?: PaymentStartStrategy;

  @Column({ name: 'payment_period_unit', type: 'varchar', length: 20, default: PaymentPeriodUnit.YEAR })
  paymentPeriodUnit?: PaymentPeriodUnit;

  @Column({ name: 'work_days', type: 'varchar', length: 20, default: WorkDays.FIVE_DAYS })
  workDays?: WorkDays;

  @Column({ name: 'separate_group_payments', type: 'boolean', default: false })
  separateGroupPayments?: boolean;

  @Column({ name: 'group_monthly_payments', type: 'jsonb', default: '[]' })
  groupMonthlyPayments?: Array<{ groupName: string; amount: number }>;

  @Column({ name: 'total_capacity', type: 'integer', default: 0 })
  totalCapacity?: number;

  @Column({ name: 'elementary_capacity', type: 'integer', default: 0 })
  elementaryCapacity?: number;

  @Column({ name: 'upper_capacity', type: 'integer', default: 0 })
  upperCapacity?: number;

  @Column({ name: 'logo_file_id', type: 'uuid', nullable: true })
  logoFileId?: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl?: string | null;

  @Column({ type: 'varchar', length: 20, default: CommonStatus.ACTIVE })
  status?: CommonStatus;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency?: string;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Tashkent' })
  timezone?: string;

  @Column({ type: 'varchar', length: 12, default: 'uz' })
  language?: string;

  @OneToMany(() => Branch, (branch) => branch.school)
  branches?: Branch[];
}
