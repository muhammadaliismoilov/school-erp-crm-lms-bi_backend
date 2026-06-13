import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ImproveSchoolsForManagement1780800007000 implements MigrationInterface {
  name = 'ImproveSchoolsForManagement1780800007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schools" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "address" varchar(255),
        "contact_email" varchar(254),
        "contact_phone" varchar(32),
        "currency" varchar(3) NOT NULL DEFAULT 'UZS',
        "timezone" varchar(64) NOT NULL DEFAULT 'Asia/Tashkent',
        "language" varchar(12) NOT NULL DEFAULT 'uz',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1
      )
    `);
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "normalized_name" varchar(180)');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "legal_name" varchar(255)');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "region" varchar(120)');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "district" varchar(120)');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "city" varchar(120)');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "website_url" varchar(255)');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "school_type" varchar(40) DEFAULT \'general\'');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "monthly_payment" integer DEFAULT 0');
    await queryRunner.query(`
      ALTER TABLE "schools"
      ADD COLUMN IF NOT EXISTS "payment_start_strategy" varchar(40) DEFAULT 'full_academic_year'
    `);
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "payment_period_unit" varchar(20) DEFAULT \'year\'');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "work_days" varchar(20) DEFAULT \'five_days\'');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "separate_group_payments" boolean DEFAULT false');
    await queryRunner.query(`
      ALTER TABLE "schools"
      ADD COLUMN IF NOT EXISTS "group_monthly_payments" jsonb DEFAULT '[]'::jsonb
    `);
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "total_capacity" integer DEFAULT 0');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "elementary_capacity" integer DEFAULT 0');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "upper_capacity" integer DEFAULT 0');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "logo_file_id" uuid');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "logo_url" varchar(255)');
    await queryRunner.query('ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT \'active\'');
    await queryRunner.query(`
      UPDATE "schools"
      SET
        "normalized_name" = COALESCE(
          "normalized_name",
          lower(regexp_replace(trim(COALESCE(
            CASE 
              WHEN "name" LIKE '{%' OR "name" LIKE '[%' THEN 
                COALESCE(
                  ("name"::jsonb)->>'uz',
                  ("name"::jsonb)->>'ru',
                  ("name"::jsonb)->>'en'
                )
              ELSE "name"
            END
          )), '\\s+', ' ', 'g'))
        ),
        "school_type" = COALESCE("school_type", 'general'),
        "monthly_payment" = COALESCE("monthly_payment", 0),
        "payment_start_strategy" = COALESCE("payment_start_strategy", 'full_academic_year'),
        "payment_period_unit" = COALESCE("payment_period_unit", 'year'),
        "work_days" = COALESCE("work_days", 'five_days'),
        "separate_group_payments" = COALESCE("separate_group_payments", false),
        "group_monthly_payments" = COALESCE("group_monthly_payments", '[]'::jsonb),
        "total_capacity" = COALESCE("total_capacity", 0),
        "elementary_capacity" = COALESCE("elementary_capacity", 0),
        "upper_capacity" = COALESCE("upper_capacity", 0),
        "status" = COALESCE("status", 'active')
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_schools_normalized_name_active"
      ON "schools" ("normalized_name")
      WHERE "deleted_at" IS NULL AND "normalized_name" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_schools_type_status"
      ON "schools" ("school_type", "status")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_schools_capacity_non_negative') THEN
          ALTER TABLE "schools"
          ADD CONSTRAINT "chk_schools_capacity_non_negative"
          CHECK ("total_capacity" >= 0 AND "elementary_capacity" >= 0 AND "upper_capacity" >= 0);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_schools_payment_non_negative') THEN
          ALTER TABLE "schools"
          ADD CONSTRAINT "chk_schools_payment_non_negative"
          CHECK ("monthly_payment" >= 0);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_schools_status') THEN
          ALTER TABLE "schools"
          ADD CONSTRAINT "chk_schools_status"
          CHECK ("status" IN ('active', 'inactive', 'archived'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_schools_type') THEN
          ALTER TABLE "schools"
          ADD CONSTRAINT "chk_schools_type"
          CHECK ("school_type" IN ('general', 'private', 'specialized', 'international'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "schools" DROP CONSTRAINT IF EXISTS "chk_schools_type"');
    await queryRunner.query('ALTER TABLE "schools" DROP CONSTRAINT IF EXISTS "chk_schools_status"');
    await queryRunner.query('ALTER TABLE "schools" DROP CONSTRAINT IF EXISTS "chk_schools_payment_non_negative"');
    await queryRunner.query('ALTER TABLE "schools" DROP CONSTRAINT IF EXISTS "chk_schools_capacity_non_negative"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_schools_type_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "uq_schools_normalized_name_active"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "status"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "logo_url"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "logo_file_id"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "upper_capacity"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "elementary_capacity"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "total_capacity"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "group_monthly_payments"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "separate_group_payments"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "work_days"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "payment_period_unit"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "payment_start_strategy"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "monthly_payment"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "school_type"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "website_url"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "city"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "district"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "region"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "legal_name"');
    await queryRunner.query('ALTER TABLE "schools" DROP COLUMN IF EXISTS "normalized_name"');
  }
}
