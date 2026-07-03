import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { MessageChannel } from '../enums/communication.enums';

@Entity('message_templates')
@Index(['code'], { unique: true, where: 'deleted_at IS NULL' })
export class MessageTemplate extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ length: 80 }) code: string;
  @Column({ length: 180 }) name: string;
  @Column({ type: 'enum', enum: MessageChannel }) channel: MessageChannel;
  @Column({ type: 'varchar', length: 220, nullable: true }) subject?: string | null;
  @Column({ type: 'text' }) body: string;
  @Column({ name: 'variables', type: 'jsonb', default: () => "'[]'" }) variables: string[];
  @Column({ default: true }) active: boolean;
}
