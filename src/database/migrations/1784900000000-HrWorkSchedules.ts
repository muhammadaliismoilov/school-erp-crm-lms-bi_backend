import type { MigrationInterface, QueryRunner } from 'typeorm';

/** HR "Jadvallar" moduli: `hr_work_schedules` va `hr_work_schedule_days` jadvallarini yaratadi. */
export class HrWorkSchedules1784900000000 implements MigrationInterface {
  name = 'HrWorkSchedules1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_work_schedule_days_weekday_enum" AS ENUM
         ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_work_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "name" varchar(160) NOT NULL,
        "description" text,
        "is_standard" boolean NOT NULL DEFAULT false,
        CONSTRAINT "pk_hr_work_schedules" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_work_schedules_standard" ON "hr_work_schedules" ("is_standard")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_work_schedule_days" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "schedule_id" uuid NOT NULL,
        "weekday" "hr_work_schedule_days_weekday_enum" NOT NULL,
        "start_time" time,
        "end_time" time,
        "lunch_start" time,
        "lunch_end" time,
        CONSTRAINT "pk_hr_work_schedule_days" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_work_schedule_days" ADD CONSTRAINT "fk_hr_work_schedule_days_schedule"
          FOREIGN KEY ("schedule_id") REFERENCES "hr_work_schedules"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_work_schedule_days_schedule" ON "hr_work_schedule_days" ("schedule_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_work_schedule_days"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_work_schedules"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_work_schedule_days_weekday_enum"`);
  }
}
