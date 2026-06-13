import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ImproveSubjectsForSettings1780800005000 implements MigrationInterface {
  name = 'ImproveSubjectsForSettings1780800005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subjects" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "normalized_name" varchar(160),
        "code" varchar(40) NOT NULL,
        "color" varchar(7) NOT NULL DEFAULT '#2563EB',
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "description" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "subjects"
      ADD COLUMN IF NOT EXISTS "normalized_name" varchar(160)
    `);
    await queryRunner.query(`
      ALTER TABLE "subjects"
      ADD COLUMN IF NOT EXISTS "color" varchar(7) DEFAULT '#2563EB'
    `);
    await queryRunner.query(`
      ALTER TABLE "subjects"
      ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'active'
    `);
    await queryRunner.query(`
      UPDATE "subjects"
      SET
        "normalized_name" = lower(
          regexp_replace(
            trim(COALESCE(
              CASE 
                WHEN "name" LIKE '{%' OR "name" LIKE '[%' THEN 
                  COALESCE(
                    ("name"::jsonb)->>'uz',
                    ("name"::jsonb)->>'ru',
                    ("name"::jsonb)->>'en'
                  )
                ELSE "name"
              END,
              "code"
            )),
            '\\s+',
            ' ',
            'g'
          )
        ),
        "color" = CASE
          WHEN "color" ~ '^#[0-9A-Fa-f]{6}$' THEN upper("color")
          ELSE '#2563EB'
        END,
        "status" = CASE
          WHEN "status" IN ('active', 'inactive', 'archived') THEN "status"
          ELSE 'active'
        END
      WHERE "normalized_name" IS NULL
        OR "normalized_name" = ''
        OR "color" IS NULL
        OR "status" IS NULL
        OR "status" NOT IN ('active', 'inactive', 'archived')
    `);
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          "id",
          "normalized_name",
          row_number() OVER (PARTITION BY "normalized_name" ORDER BY "created_at", "id") AS rn
        FROM "subjects"
        WHERE "deleted_at" IS NULL
      )
      UPDATE "subjects" s
      SET "normalized_name" = left(s."normalized_name", 151) || '-' || substring(s."id"::text, 1, 8)
      FROM ranked r
      WHERE s."id" = r."id" AND r.rn > 1
    `);
    await queryRunner.query(`
      ALTER TABLE "subjects"
      ALTER COLUMN "normalized_name" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "subjects"
      ALTER COLUMN "color" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "subjects"
      ALTER COLUMN "status" SET NOT NULL
    `);
    await queryRunner.query('DROP INDEX IF EXISTS "uq_subjects_code"');
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_subjects_code_active"
      ON "subjects" ("code")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_subjects_normalized_name_active"
      ON "subjects" ("normalized_name")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_subjects_status"
      ON "subjects" ("status")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_subjects_color_hex'
        ) THEN
          ALTER TABLE "subjects"
          ADD CONSTRAINT "chk_subjects_color_hex"
          CHECK ("color" ~ '^#[0-9A-F]{6}$');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_subjects_status'
        ) THEN
          ALTER TABLE "subjects"
          ADD CONSTRAINT "chk_subjects_status"
          CHECK ("status" IN ('active', 'inactive', 'archived'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "chk_subjects_status"');
    await queryRunner.query('ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "chk_subjects_color_hex"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_subjects_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "uq_subjects_normalized_name_active"');
    await queryRunner.query('DROP INDEX IF EXISTS "uq_subjects_code_active"');
    await queryRunner.query('ALTER TABLE "subjects" DROP COLUMN IF EXISTS "status"');
    await queryRunner.query('ALTER TABLE "subjects" DROP COLUMN IF EXISTS "color"');
    await queryRunner.query('ALTER TABLE "subjects" DROP COLUMN IF EXISTS "normalized_name"');
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_subjects_code"
      ON "subjects" ("code")
    `);
  }
}
