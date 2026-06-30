import { MigrationInterface, QueryRunner } from 'typeorm';

/** HR "Nomzodlar" moduli: `hr_candidates` jadvalini yaratadi (recruitment pipeline). */
export class HrCandidates1784500000000 implements MigrationInterface {
  name = 'HrCandidates1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_candidates_stage_enum" AS ENUM
         ('new', 'screening', 'interview', 'test', 'offer', 'hired', 'rejected');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_candidates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "first_name" varchar(80) NOT NULL,
        "last_name" varchar(80) NOT NULL,
        "email" varchar(120) NOT NULL,
        "phone" varchar(20),
        "vacancy_id" uuid,
        "recruiter_id" uuid,
        "stage" "hr_candidates_stage_enum" NOT NULL DEFAULT 'new',
        "stage_status" varchar(120),
        "notes" text,
        CONSTRAINT "pk_hr_candidates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_candidates" ADD CONSTRAINT "fk_hr_candidates_vacancy"
          FOREIGN KEY ("vacancy_id") REFERENCES "hr_vacancies"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_candidates" ADD CONSTRAINT "fk_hr_candidates_recruiter"
          FOREIGN KEY ("recruiter_id") REFERENCES "hr_staff_members"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_candidates_stage" ON "hr_candidates" ("stage")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_candidates_vacancy" ON "hr_candidates" ("vacancy_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_candidates"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_candidates_stage_enum"`);
  }
}
