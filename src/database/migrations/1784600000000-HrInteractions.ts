import { MigrationInterface, QueryRunner } from 'typeorm';

/** HR "Muloqotlar" moduli: `hr_interactions` jadvalini yaratadi. */
export class HrInteractions1784600000000 implements MigrationInterface {
  name = 'HrInteractions1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_interactions_type_enum" AS ENUM
         ('call', 'meeting', 'email', 'interview', 'other');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_interactions_status_enum" AS ENUM ('planned', 'completed', 'cancelled');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_interactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "title" varchar(200) NOT NULL,
        "type" "hr_interactions_type_enum" NOT NULL DEFAULT 'call',
        "status" "hr_interactions_status_enum" NOT NULL DEFAULT 'planned',
        "candidate_id" uuid,
        "location" varchar(200),
        "scheduled_at" TIMESTAMPTZ,
        "end_at" TIMESTAMPTZ,
        "purpose" text,
        "description" text,
        "result" text,
        "summary" text,
        "next_steps" text,
        CONSTRAINT "pk_hr_interactions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_interactions" ADD CONSTRAINT "fk_hr_interactions_candidate"
          FOREIGN KEY ("candidate_id") REFERENCES "hr_candidates"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_interactions_status" ON "hr_interactions" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_interactions_candidate" ON "hr_interactions" ("candidate_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_interactions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_interactions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_interactions_type_enum"`);
  }
}
