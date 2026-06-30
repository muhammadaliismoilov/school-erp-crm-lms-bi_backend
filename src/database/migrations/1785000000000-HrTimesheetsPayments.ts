import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Ish vaqti hisobi" va "To'lovlar" modullari: `hr_timesheets`,
 * `hr_timesheet_lines` va `hr_payments` jadvallarini yaratadi.
 */
export class HrTimesheetsPayments1785000000000 implements MigrationInterface {
  name = 'HrTimesheetsPayments1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_timesheets_status_enum" AS ENUM ('draft', 'submitted', 'approved');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_payments_status_enum" AS ENUM
         ('pending', 'processing', 'paid', 'failed', 'cancelled');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_timesheets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "year" integer NOT NULL,
        "month" integer NOT NULL,
        "department_id" uuid,
        "status" "hr_timesheets_status_enum" NOT NULL DEFAULT 'draft',
        "submitted_at" TIMESTAMPTZ,
        "approved_at" TIMESTAMPTZ,
        "note" text,
        CONSTRAINT "pk_hr_timesheets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_timesheets" ADD CONSTRAINT "fk_hr_timesheets_department"
          FOREIGN KEY ("department_id") REFERENCES "hr_departments"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_hr_timesheets_period" ON "hr_timesheets" ("year", "month", "department_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_timesheets_status" ON "hr_timesheets" ("status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_timesheet_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "timesheet_id" uuid NOT NULL,
        "staff_member_id" uuid NOT NULL,
        "worked_days" numeric(5,1) NOT NULL DEFAULT 0,
        "worked_hours" numeric(7,1) NOT NULL DEFAULT 0,
        "note" text,
        CONSTRAINT "pk_hr_timesheet_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_timesheet_lines" ADD CONSTRAINT "fk_hr_timesheet_lines_timesheet"
          FOREIGN KEY ("timesheet_id") REFERENCES "hr_timesheets"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_timesheet_lines" ADD CONSTRAINT "fk_hr_timesheet_lines_staff"
          FOREIGN KEY ("staff_member_id") REFERENCES "hr_staff_members"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_timesheet_lines_timesheet" ON "hr_timesheet_lines" ("timesheet_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "staff_member_id" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL DEFAULT 0,
        "payment_date" date,
        "status" "hr_payments_status_enum" NOT NULL DEFAULT 'pending',
        "timesheet_id" uuid,
        "note" text,
        CONSTRAINT "pk_hr_payments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_payments" ADD CONSTRAINT "fk_hr_payments_staff"
          FOREIGN KEY ("staff_member_id") REFERENCES "hr_staff_members"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_payments" ADD CONSTRAINT "fk_hr_payments_timesheet"
          FOREIGN KEY ("timesheet_id") REFERENCES "hr_timesheets"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_payments_status" ON "hr_payments" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_payments_staff" ON "hr_payments" ("staff_member_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_timesheet_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_timesheets"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_timesheets_status_enum"`);
  }
}
