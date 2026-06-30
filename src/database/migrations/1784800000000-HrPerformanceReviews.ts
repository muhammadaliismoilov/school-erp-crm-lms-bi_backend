import { MigrationInterface, QueryRunner } from 'typeorm';

/** HR "Samaradorlik baholash" moduli: `hr_performance_reviews` jadvalini yaratadi. */
export class HrPerformanceReviews1784800000000 implements MigrationInterface {
  name = 'HrPerformanceReviews1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_performance_reviews_status_enum" AS ENUM ('draft', 'completed');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_performance_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "staff_member_id" uuid NOT NULL,
        "reviewer_id" uuid,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "overall_rating" numeric(3,1),
        "strengths" text,
        "improvements" text,
        "goals" text,
        "notes" text,
        "status" "hr_performance_reviews_status_enum" NOT NULL DEFAULT 'completed',
        CONSTRAINT "pk_hr_performance_reviews" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "fk_hr_perf_reviews_staff"
          FOREIGN KEY ("staff_member_id") REFERENCES "hr_staff_members"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "fk_hr_perf_reviews_reviewer"
          FOREIGN KEY ("reviewer_id") REFERENCES "hr_staff_members"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_perf_reviews_staff" ON "hr_performance_reviews" ("staff_member_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_perf_reviews_status" ON "hr_performance_reviews" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_performance_reviews"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_performance_reviews_status_enum"`);
  }
}
