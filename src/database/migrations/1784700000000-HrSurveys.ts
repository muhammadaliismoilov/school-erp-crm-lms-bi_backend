import { MigrationInterface, QueryRunner } from 'typeorm';

/** HR "So'rovnomalar" moduli: `hr_surveys` jadvalini yaratadi. */
export class HrSurveys1784700000000 implements MigrationInterface {
  name = 'HrSurveys1784700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_surveys_type_enum" AS ENUM ('anonymous', 'public');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_surveys_status_enum" AS ENUM ('draft', 'active', 'closed');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_surveys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "title" varchar(200) NOT NULL,
        "description" text,
        "type" "hr_surveys_type_enum" NOT NULL DEFAULT 'anonymous',
        "status" "hr_surveys_status_enum" NOT NULL DEFAULT 'draft',
        "is_anonymous" boolean NOT NULL DEFAULT true,
        "start_date" date,
        "end_date" date,
        CONSTRAINT "pk_hr_surveys" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_surveys_status" ON "hr_surveys" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_surveys"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_surveys_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_surveys_type_enum"`);
  }
}
