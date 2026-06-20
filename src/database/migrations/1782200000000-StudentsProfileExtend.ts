import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * O‘quvchilar moduli kengaytmasi:
 *  - `students` jadvaliga profil maydonlari (til, rasm, shartnoma, chegirma,
 *    manzil, qiziqishlar, qo‘shimcha hujjatlar).
 *  - Yangi jadvallar: `student_achievements` (Yutuqlar),
 *    `student_conclusions` (Tutor/Psixolog xulosalari),
 *    `student_smart_goals` (Kelajak rejasi).
 */
export class StudentsProfileExtend1782200000000 implements MigrationInterface {
  name = 'StudentsProfileExtend1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Enumlar ---
    await queryRunner.query(
      `CREATE TYPE "public"."students_preferred_language_enum" AS ENUM('uz', 'ru', 'en')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_achievements_category_enum" AS ENUM('academic', 'olympiad', 'sport', 'art', 'community', 'participation')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_achievements_rank_enum" AS ENUM('first', 'second', 'third', 'fourth', 'fifth', 'participation')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_achievements_icon_enum" AS ENUM('trophy', 'medal', 'award', 'star', 'certificate', 'crown')`,
    );

    // --- students yangi ustunlar ---
    await queryRunner.query(`ALTER TABLE "students" ADD "middle_name" character varying(80)`);
    await queryRunner.query(
      `ALTER TABLE "students" ADD "preferred_language" "public"."students_preferred_language_enum" NOT NULL DEFAULT 'uz'`,
    );
    await queryRunner.query(`ALTER TABLE "students" ADD "photo_url" text`);
    await queryRunner.query(`ALTER TABLE "students" ADD "contract_number" character varying(60)`);
    await queryRunner.query(
      `ALTER TABLE "students" ADD "discount_percent" numeric(5,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "students" ADD "region" character varying(80)`);
    await queryRunner.query(`ALTER TABLE "students" ADD "district" character varying(80)`);
    await queryRunner.query(`ALTER TABLE "students" ADD "address" text`);
    await queryRunner.query(`ALTER TABLE "students" ADD "personal_phone" character varying(32)`);
    await queryRunner.query(
      `ALTER TABLE "students" ADD "interests" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "extra_documents" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );

    // --- student_achievements ---
    await queryRunner.query(`
      CREATE TABLE "student_achievements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL,
        "student_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "category" "public"."student_achievements_category_enum" NOT NULL DEFAULT 'participation',
        "rank" "public"."student_achievements_rank_enum" NOT NULL DEFAULT 'participation',
        "icon" "public"."student_achievements_icon_enum" NOT NULL DEFAULT 'trophy',
        "achieved_at" date,
        "organization" character varying(200),
        "description" text,
        "certificate_url" text,
        CONSTRAINT "PK_student_achievements" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_student_achievements_student" ON "student_achievements" ("student_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_student_achievements_category" ON "student_achievements" ("category")`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_achievements" ADD CONSTRAINT "FK_student_achievements_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // --- student_conclusions ---
    await queryRunner.query(`
      CREATE TABLE "student_conclusions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL,
        "student_id" uuid NOT NULL,
        "academic_year_id" uuid,
        "tutor_note" text,
        "tutor_metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "psychologist_note" text,
        "psych_metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "PK_student_conclusions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_student_conclusions_year" ON "student_conclusions" ("student_id", "academic_year_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_conclusions" ADD CONSTRAINT "FK_student_conclusions_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // --- student_smart_goals ---
    await queryRunner.query(`
      CREATE TABLE "student_smart_goals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "version" integer NOT NULL,
        "student_id" uuid NOT NULL,
        "academic_year_id" uuid,
        "character_note" text,
        "development_note" text,
        "work_note" text,
        "smart_goals" jsonb NOT NULL DEFAULT '[]'::jsonb,
        CONSTRAINT "PK_student_smart_goals" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_student_smart_goals_year" ON "student_smart_goals" ("student_id", "academic_year_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_smart_goals" ADD CONSTRAINT "FK_student_smart_goals_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_smart_goals" DROP CONSTRAINT "FK_student_smart_goals_student"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_student_smart_goals_year"`);
    await queryRunner.query(`DROP TABLE "student_smart_goals"`);

    await queryRunner.query(
      `ALTER TABLE "student_conclusions" DROP CONSTRAINT "FK_student_conclusions_student"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_student_conclusions_year"`);
    await queryRunner.query(`DROP TABLE "student_conclusions"`);

    await queryRunner.query(
      `ALTER TABLE "student_achievements" DROP CONSTRAINT "FK_student_achievements_student"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_student_achievements_category"`);
    await queryRunner.query(`DROP INDEX "public"."idx_student_achievements_student"`);
    await queryRunner.query(`DROP TABLE "student_achievements"`);

    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "extra_documents"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "interests"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "personal_phone"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "address"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "district"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "region"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "discount_percent"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "contract_number"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "photo_url"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "preferred_language"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "middle_name"`);

    await queryRunner.query(`DROP TYPE "public"."student_achievements_icon_enum"`);
    await queryRunner.query(`DROP TYPE "public"."student_achievements_rank_enum"`);
    await queryRunner.query(`DROP TYPE "public"."student_achievements_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."students_preferred_language_enum"`);
  }
}
