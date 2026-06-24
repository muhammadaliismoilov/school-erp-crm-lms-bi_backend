import { Column, Entity, Index } from 'typeorm';
import { UuidAuditEntity } from '../../../common/entities/abstract.entity';

/**
 * To'lov turi (Naqd, Plastik karta, Click, Payme ...). Tranzaksiya yaratishda
 * "To'lov turi" dropdown'ini to'ldiradi. Seed qilingan tizim yozuvlari
 * (isSystem=true) o'chirilmaydi, faqat foydalanuvchi qo'shganlari boshqariladi.
 */
@Entity('payment_types')
@Index('idx_payment_types_active', ['isActive'])
export class PaymentType extends UuidAuditEntity {
  @Column({ type: 'varchar', length: 80 })
  name: string;

  /** Mashinaga mos kod (naqd, card, bank ...). Unikal. */
  @Column({ type: 'varchar', length: 40, unique: true })
  code: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Tizim tomonidan seed qilingan — o'chirib bo'lmaydi. */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;
}
