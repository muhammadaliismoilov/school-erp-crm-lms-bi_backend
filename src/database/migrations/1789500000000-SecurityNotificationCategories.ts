import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Xavfsizlik ogohlantirishlari (S4): notification kategoriya enumiga
 * `security_login` (yangi qurilmadan kirish) va `security_password`
 * (parol almashinuvi) qiymatlari qo'shiladi.
 */
export class SecurityNotificationCategories1789500000000 implements MigrationInterface {
  name = 'SecurityNotificationCategories1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notification_category_enum" ADD VALUE IF NOT EXISTS 'security_login'`,
    );
    await queryRunner.query(
      `ALTER TYPE "notification_category_enum" ADD VALUE IF NOT EXISTS 'security_password'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres enum'dan qiymat olib tashlashni qo'llamaydi — qiymatlar qoladi (zararsiz).
  }
}
