import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `grade_change_requests` jadvalini yaratadi — "Baho o'zgartirish so'rovi"
 * moduli uchun. Kunlik baholash, kurs bahosi va choraklik baho turlari;
 * kutilmoqda → tasdiqlangan/rad etilgan workflow.
 */
export class GradeChangeRequests1782600000000 implements MigrationInterface {
  name = 'GradeChangeRequests1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "grade_change_requests_kind_enum" AS ENUM ('assessment', 'course', 'quarter');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "grade_change_requests_status_enum" AS ENUM ('pending', 'approved', 'rejected');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grade_change_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "kind" "grade_change_requests_kind_enum" NOT NULL,
        "student_id" uuid NOT NULL,
        "subject_id" uuid,
        "quarter_id" uuid,
        "target_entity_id" uuid,
        "current_grade" numeric(6,2),
        "requested_grade" numeric(6,2) NOT NULL,
        "reason" text NOT NULL,
        "status" "grade_change_requests_status_enum" NOT NULL DEFAULT 'pending',
        "requested_by_id" uuid,
        "reviewed_by_id" uuid,
        "reviewed_at" TIMESTAMPTZ,
        "review_note" text,
        "applied" boolean NOT NULL DEFAULT false,
        CONSTRAINT "pk_grade_change_requests" PRIMARY KEY ("id"),
        CONSTRAINT "fk_gcr_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_gcr_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_gcr_quarter" FOREIGN KEY ("quarter_id") REFERENCES "quarters"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_gcr_status" ON "grade_change_requests" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_gcr_kind" ON "grade_change_requests" ("kind")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_gcr_student" ON "grade_change_requests" ("student_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_gcr_subject" ON "grade_change_requests" ("subject_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_gcr_subject"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_gcr_student"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_gcr_kind"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_gcr_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "grade_change_requests"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "grade_change_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "grade_change_requests_kind_enum"`);
  }
}
