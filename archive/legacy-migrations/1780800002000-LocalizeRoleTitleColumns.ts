import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LocalizeRoleTitleColumns1780800002000 implements MigrationInterface {
  name = 'LocalizeRoleTitleColumns1780800002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'roles'
            AND column_name = 'title'
            AND data_type <> 'jsonb'
        ) THEN
          ALTER TABLE "roles"
          ALTER COLUMN "title" DROP NOT NULL;

          ALTER TABLE "roles"
          ALTER COLUMN "title" TYPE jsonb
          USING CASE
            WHEN "title" IS NULL THEN NULL
            ELSE jsonb_build_object('uz', "title"::text, 'ru', "title"::text, 'en', "title"::text)
          END;
        END IF;

        UPDATE "roles"
        SET "title" = jsonb_build_object('uz', "name", 'ru', "name", 'en', "name")
        WHERE "title" IS NULL;

        ALTER TABLE "roles"
        ALTER COLUMN "title" SET NOT NULL;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'roles'
            AND column_name = 'description'
            AND data_type <> 'jsonb'
        ) THEN
          ALTER TABLE "roles"
          ALTER COLUMN "description" TYPE jsonb
          USING CASE
            WHEN "description" IS NULL THEN NULL
            ELSE jsonb_build_object(
              'uz', "description"::text,
              'ru', "description"::text,
              'en', "description"::text
            )
          END;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'roles'
            AND column_name = 'description'
            AND data_type = 'jsonb'
        ) THEN
          ALTER TABLE "roles"
          ALTER COLUMN "description" TYPE varchar
          USING COALESCE("description"->>'en', "description"->>'uz', "description"::text);
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'roles'
            AND column_name = 'title'
            AND data_type = 'jsonb'
        ) THEN
          ALTER TABLE "roles"
          ALTER COLUMN "title" TYPE varchar
          USING COALESCE("title"->>'en', "title"->>'uz', "title"::text);

          ALTER TABLE "roles"
          ALTER COLUMN "title" SET NOT NULL;
        END IF;
      END $$;
    `);
  }
}
