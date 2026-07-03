import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { WalletTransactionType } from '../enums/gamification.enums';
@Entity('student_coin_transactions')
@Index(['studentId', 'createdAt'])
export class CoinTransaction extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ name: 'student_id', type: 'uuid' }) studentId: string;
  @Column({ type: 'enum', enum: WalletTransactionType }) type: WalletTransactionType;
  @Column({ type: 'int' }) amount: number;
  @Column({ length: 180 }) reason: string;
  @Column({ name: 'source_type', type: 'varchar', length: 80, nullable: true }) sourceType?: string | null;
  @Column({ name: 'source_id', type: 'uuid', nullable: true }) sourceId?: string | null;
}
