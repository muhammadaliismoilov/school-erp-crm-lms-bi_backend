import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 2FA (S5): `users.two_factor_secret` (TOTP siri, base32) va
 * `users.two_factor_enabled`. Sir faqat 2FA oqimlarida addSelect bilan o'qiladi.
 */
export class UserTwoFactor1789600000000 implements MigrationInterface {
  name = 'UserTwoFactor1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users"
         ADD COLUMN IF NOT EXISTS "two_factor_secret" character varying(64),
         ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "two_factor_secret", DROP COLUMN IF EXISTS "two_factor_enabled"`,
    );
  }
}
