import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { StaffMember } from './staff-member.entity';

/**
 * Xodim sertifikati — soddalashtirilgan: faqat nomi va amal qilish muddati.
 * "Sertifikatlar" tabida ko'rsatiladi; muddati o'tganlari ajratib ko'rsatiladi.
 */
@Entity('hr_staff_certificates')
@Index('idx_hr_staff_certificates_staff', ['staffMemberId'])
export class StaffCertificate extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;

  @Column({ name: 'staff_member_id', type: 'uuid' })
  staffMemberId: string;

  @ManyToOne(() => StaffMember, (staff) => staff.certificates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: StaffMember;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** Amal qilish muddati (tugash sanasi). Muddatsiz sertifikat uchun null. */
  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt?: string | null;
}
