import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ImproveUsersForManagement1780800008000 implements MigrationInterface {
  name = 'ImproveUsersForManagement1780800008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_gender_enum') THEN
          CREATE TYPE "users_gender_enum" AS ENUM ('male', 'female');
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name_cyrillic" varchar(80)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name_cyrillic" varchar(80)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "middle_name" varchar(80)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "middle_name_cyrillic" varchar(80)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birth_date" date`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "document_number" varchar(32)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" "users_gender_enum"`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pinfl" varchar(14)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_image_url" varchar(500)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_image_file_id" uuid`);
    await queryRunner.query(`UPDATE "users" SET "first_name" = COALESCE(NULLIF("first_name", ''), "username", 'Foydalanuvchi')`);
    await queryRunner.query(`UPDATE "users" SET "last_name" = COALESCE(NULLIF("last_name", ''), 'Foydalanuvchi')`);
    await queryRunner.query(`UPDATE "users" SET "first_name_cyrillic" = COALESCE(NULLIF("first_name_cyrillic", ''), "first_name")`);
    await queryRunner.query(`UPDATE "users" SET "last_name_cyrillic" = COALESCE(NULLIF("last_name_cyrillic", ''), "last_name")`);
    await queryRunner.query(`UPDATE "users" SET "gender" = COALESCE("gender", 'male'::"users_gender_enum")`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "first_name_cyrillic" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name_cyrillic" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "gender" SET NOT NULL`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_pinfl"
      ON "users" ("pinfl")
      WHERE "pinfl" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_document_number"
      ON "users" ("document_number")
      WHERE "document_number" IS NOT NULL
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_gender" ON "users" ("gender")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_birth_date" ON "users" ("birth_date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_birth_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_gender"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_document_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_pinfl"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "gender" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name_cyrillic" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "first_name_cyrillic" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "first_name" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_image_file_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_image_url"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "pinfl"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "gender"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "document_number"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "birth_date"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "middle_name_cyrillic"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "middle_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name_cyrillic"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name_cyrillic"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_gender_enum"`);
  }
}
