import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
@Entity('student_coin_wallets')
@Index(['studentId'], { unique: true, where: 'deleted_at IS NULL' })
export class StudentCoinWallet extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ name: 'student_id', type: 'uuid' }) studentId: string;
  @Column({ type: 'int', default: 0 }) balance: number;
  @Column({ type: 'int', default: 0 }) totalEarned: number;
  @Column({ type: 'int', default: 0 }) totalSpent: number;
}
