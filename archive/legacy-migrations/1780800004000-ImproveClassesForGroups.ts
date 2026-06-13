import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ImproveClassesForGroups1780800004000 implements MigrationInterface {
  name = 'ImproveClassesForGroups1780800004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "classes"
      ADD COLUMN IF NOT EXISTS "grade_level" smallint
    `);
    await queryRunner.query(`
      ALTER TABLE "classes"
      ADD COLUMN IF NOT EXISTS "section" varchar(4)
    `);
    await queryRunner.query(`
      UPDATE "classes"
      SET
        "grade_level" = COALESCE(
          "grade_level",
          NULLIF(substring("name" from '^([0-9]{1,2})'), '')::smallint,
          1
        ),
        "section" = COALESCE(
          "section",
          NULLIF(upper(substring("name" from '^[0-9]{1,2}[- ]?([A-Za-z])')), ''),
          'A'
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "classes"
      ALTER COLUMN "grade_level" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "classes"
      ALTER COLUMN "grade_level" SET DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "classes"
      ALTER COLUMN "section" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "classes"
      ALTER COLUMN "section" SET DEFAULT 'A'
    `);
    await queryRunner.query(`
      ALTER TABLE "classes"
      ADD COLUMN IF NOT EXISTS "room_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "classes"
      ADD COLUMN IF NOT EXISTS "curator_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD COLUMN IF NOT EXISTS "current_class_id" uuid
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_classes_grade_level_range'
        ) THEN
          ALTER TABLE "classes"
          ADD CONSTRAINT "chk_classes_grade_level_range"
          CHECK ("grade_level" BETWEEN 1 AND 12);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_classes_year_grade_section_active"
      ON "classes" ("academic_year_id", "grade_level", "section")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_classes_room"
      ON "classes" ("room_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_classes_curator"
      ON "classes" ("curator_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_students_current_class"
      ON "students" ("current_class_id")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_classes_room'
        ) THEN
          ALTER TABLE "classes"
          ADD CONSTRAINT "fk_classes_room"
          FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_classes_curator'
        ) THEN
          ALTER TABLE "classes"
          ADD CONSTRAINT "fk_classes_curator"
          FOREIGN KEY ("curator_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_students_current_class'
        ) THEN
          ALTER TABLE "students"
          ADD CONSTRAINT "fk_students_current_class"
          FOREIGN KEY ("current_class_id") REFERENCES "classes"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "fk_students_current_class"');
    await queryRunner.query('ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "fk_classes_curator"');
    await queryRunner.query('ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "fk_classes_room"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_students_current_class"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_classes_curator"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_classes_room"');
    await queryRunner.query('DROP INDEX IF EXISTS "uq_classes_year_grade_section_active"');
    await queryRunner.query('ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "chk_classes_grade_level_range"');
    await queryRunner.query('ALTER TABLE "students" DROP COLUMN IF EXISTS "current_class_id"');
    await queryRunner.query('ALTER TABLE "classes" DROP COLUMN IF EXISTS "curator_id"');
    await queryRunner.query('ALTER TABLE "classes" DROP COLUMN IF EXISTS "room_id"');
    await queryRunner.query('ALTER TABLE "classes" DROP COLUMN IF EXISTS "section"');
    await queryRunner.query('ALTER TABLE "classes" DROP COLUMN IF EXISTS "grade_level"');
  }
}
