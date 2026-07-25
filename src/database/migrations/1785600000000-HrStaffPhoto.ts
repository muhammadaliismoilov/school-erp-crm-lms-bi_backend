import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Xodimlar" — xodimga fotosurat maydoni (`photo_url`) qo'shadi.
 * Barcha xodimlarning keldi-ketdi davomati FaceID orqali bo'lgani uchun
 * har bir xodimga rasm biriktirilishi kerak (o'qituvchilar ham shu jadvalda).
 */
export class HrStaffPhoto1785600000000 implements MigrationInterface {
  name = 'HrStaffPhoto1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_staff_members" ADD COLUMN IF NOT EXISTS "photo_url" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_staff_members" DROP COLUMN IF EXISTS "photo_url"`);
  }
}
