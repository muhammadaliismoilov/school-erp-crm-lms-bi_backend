import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Maktab darajasidagi modul bayrog'i.
 *
 * Qator YO'QLIGI — "kodda ko'rsatilgan default" degani (`GATED_MODULES`),
 * ya'ni migratsiya hech kimga qator qo'shmaydi va bayroqli modul hamma
 * maktabda yopiq holda uyg'onadi.
 */
@Entity('school_modules')
@Index('uq_school_modules_school_module', ['schoolId', 'module'], { unique: true })
export class SchoolModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  /** `GATED_MODULES` kalitlaridan biri (masalan `integrations`). */
  @Column({ type: 'varchar', length: 64 })
  module: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  /** Kim yoqqan — FK EMAS: foydalanuvchi o'chirilsa ham tarix qolsin. */
  @Column({ name: 'enabled_by', type: 'uuid', nullable: true })
  enabledBy?: string | null;

  @Column({ name: 'enabled_at', type: 'timestamptz', nullable: true })
  enabledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
