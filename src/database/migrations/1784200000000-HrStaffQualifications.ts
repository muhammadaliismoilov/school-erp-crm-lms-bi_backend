import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR xodimlari uchun malaka toifasi, sertifikatlar va yutuqlar.
 *
 *  - `hr_staff_members` ga `qualification_category` (malaka toifasi) va
 *    `qualification_date` (toifa berilgan sana) qo'shadi.
 *  - `hr_staff_certificates` — soddalashtirilgan sertifikat (nomi + muddat).
 *  - `hr_staff_achievements` — xodim yutuqlari (o'quvchi yutuqlari namunasida).
 */
export class HrStaffQualifications1784200000000 implements MigrationInterface {
  name = 'HrStaffQualifications1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enum turlari ────────────────────────────────────────────────────────
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "hr_staff_members_qualification_category_enum" AS ENUM ('mutaxassis', 'ikkinchi', 'birinchi', 'oliy');
    EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "hr_staff_achievements_category_enum" AS ENUM ('academic', 'olympiad', 'sport', 'art', 'community', 'participation');
    EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "hr_staff_achievements_rank_enum" AS ENUM ('first', 'second', 'third', 'fourth', 'fifth', 'participation');
    EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "hr_staff_achievements_icon_enum" AS ENUM ('trophy', 'medal', 'award', 'star', 'certificate', 'crown');
    EXCEPTION WHEN duplicate_object THEN null; END $$`);

    // ─── Malaka toifasi ustunlari ────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "hr_staff_members"
        ADD COLUMN IF NOT EXISTS "qualification_category" "hr_staff_members_qualification_category_enum",
        ADD COLUMN IF NOT EXISTS "qualification_date" date
    `);

    // ─── Sertifikatlar jadvali ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_staff_certificates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "staff_member_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "expires_at" date,
        CONSTRAINT "pk_hr_staff_certificates" PRIMARY KEY ("id"),
        CONSTRAINT "fk_hr_staff_certificates_staff" FOREIGN KEY ("staff_member_id")
          REFERENCES "hr_staff_members"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_staff_certificates_staff" ON "hr_staff_certificates" ("staff_member_id")`,
    );

    // ─── Yutuqlar jadvali ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_staff_achievements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "staff_member_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "category" "hr_staff_achievements_category_enum" NOT NULL DEFAULT 'participation',
        "rank" "hr_staff_achievements_rank_enum" NOT NULL DEFAULT 'participation',
        "icon" "hr_staff_achievements_icon_enum" NOT NULL DEFAULT 'trophy',
        "achieved_at" date,
        "organization" varchar(200),
        "description" text,
        "certificate_url" text,
        CONSTRAINT "pk_hr_staff_achievements" PRIMARY KEY ("id"),
        CONSTRAINT "fk_hr_staff_achievements_staff" FOREIGN KEY ("staff_member_id")
          REFERENCES "hr_staff_members"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_staff_achievements_staff" ON "hr_staff_achievements" ("staff_member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_staff_achievements_category" ON "hr_staff_achievements" ("category")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_staff_achievements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_staff_certificates"`);
    await queryRunner.query(`
      ALTER TABLE "hr_staff_members"
        DROP COLUMN IF EXISTS "qualification_category",
        DROP COLUMN IF EXISTS "qualification_date"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_staff_achievements_icon_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_staff_achievements_rank_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_staff_achievements_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_staff_members_qualification_category_enum"`);
  }
}
