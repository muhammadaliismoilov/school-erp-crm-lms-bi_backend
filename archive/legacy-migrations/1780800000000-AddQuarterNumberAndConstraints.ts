import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuarterNumberAndConstraints1780800000000 implements MigrationInterface {
  name = 'AddQuarterNumberAndConstraints1780800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quarters"
      ADD COLUMN IF NOT EXISTS "quarter_number" smallint
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'quarters'
            AND column_name = 'name'
            AND data_type = 'jsonb'
        ) THEN
          UPDATE "quarters"
          SET "quarter_number" = CASE
            WHEN ("name"->>'uz') ~ '^[1-4]' THEN substring("name"->>'uz' from '^[1-4]')::smallint
            WHEN ("name"->>'en') ~ '[1-4]' THEN substring("name"->>'en' from '[1-4]')::smallint
            ELSE "quarter_number"
          END
          WHERE "quarter_number" IS NULL;
        ELSE
          UPDATE "quarters"
          SET "quarter_number" = CASE
            WHEN "name" ~ '^[1-4]' THEN substring("name" from '^[1-4]')::smallint
            WHEN "name" ~ '[1-4]' THEN substring("name" from '[1-4]')::smallint
            ELSE "quarter_number"
          END
          WHERE "quarter_number" IS NULL;

          ALTER TABLE "quarters"
          ALTER COLUMN "name" TYPE jsonb
          USING jsonb_build_object('uz', "name"::text, 'ru', "name"::text, 'en', "name"::text);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "quarters" WHERE "quarter_number" IS NULL) THEN
          RAISE EXCEPTION 'Cannot infer quarter_number for existing quarters';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "quarters"
      ALTER COLUMN "quarter_number" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "quarters"
      ALTER COLUMN "status" SET DEFAULT 'planned'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_quarters_academic_year"
      ON "quarters" ("academic_year_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_quarters_academic_year_number_active"
      ON "quarters" ("academic_year_id", "quarter_number")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "uq_quarters_academic_year_number_active"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_quarters_academic_year"');
    await queryRunner.query(`
      ALTER TABLE "quarters"
      ALTER COLUMN "status" SET DEFAULT 'planned'
    `);
    await queryRunner.query(`
      ALTER TABLE "quarters"
      DROP COLUMN IF EXISTS "quarter_number"
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'quarters'
            AND column_name = 'name'
            AND data_type = 'jsonb'
        ) THEN
          ALTER TABLE "quarters"
          ALTER COLUMN "name" TYPE varchar
          USING COALESCE("name"->>'uz', "name"->>'en', "name"::text);
        END IF;
      END $$;
    `);
  }
}
