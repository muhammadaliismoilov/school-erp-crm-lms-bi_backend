import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';
import { DeliveryStatus, MessageChannel } from '../enums/communication.enums';

@Entity('message_deliveries')
@Index(['recipientType', 'recipientId'])
export class MessageDelivery extends UuidAuditEntity {
  @Column({ name: 'school_id', type: 'uuid', nullable: true }) schoolId?: string | null;
  @Column({ name: 'filial_id', type: 'uuid', nullable: true }) filialId?: string | null;
  @Column({ name: 'campaign_id', type: 'uuid', nullable: true }) campaignId?: string | null;
  @Column({ type: 'enum', enum: MessageChannel }) channel: MessageChannel;
  @Column({ name: 'recipient_type', length: 80 }) recipientType: string;
  @Column({ name: 'recipient_id', type: 'uuid', nullable: true }) recipientId?: string | null;
  @Column({ length: 180 }) destination: string;
  @Column({ type: 'varchar', length: 220, nullable: true }) subject?: string | null;
  @Column({ type: 'text' }) body: string;
  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.QUEUED }) status: DeliveryStatus;
  @Column({ name: 'provider_message_id', type: 'varchar', length: 180, nullable: true }) providerMessageId?: string | null;
  @Column({ name: 'error_message', type: 'text', nullable: true }) errorMessage?: string | null;
}
