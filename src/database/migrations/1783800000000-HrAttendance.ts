import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Davomat" moduli: `hr_geofences` (minimal lokatsiyalar) va
 * `hr_attendance_records` (kirish/chiqish davomati) jadvallarini yaratadi.
 */
export class HrAttendance1783800000000 implements MigrationInterface {
  name = 'HrAttendance1783800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_attendance_action_enum" AS ENUM ('check_in', 'check_out');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_attendance_status_enum" AS ENUM ('pending', 'approved', 'rejected');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_geofences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "name" varchar(160) NOT NULL,
        "latitude" numeric(10,7),
        "longitude" numeric(10,7),
        "radius_m" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "pk_hr_geofences" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_hr_geofences_name_active" ON "hr_geofences" ("name") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_attendance_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "staff_member_id" uuid NOT NULL,
        "action" "hr_attendance_action_enum" NOT NULL,
        "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "latitude" numeric(10,7),
        "longitude" numeric(10,7),
        "geofence_id" uuid,
        "device_info" text,
        "status" "hr_attendance_status_enum" NOT NULL DEFAULT 'pending',
        CONSTRAINT "pk_hr_attendance_records" PRIMARY KEY ("id"),
        CONSTRAINT "fk_hr_attendance_staff" FOREIGN KEY ("staff_member_id")
          REFERENCES "hr_staff_members"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_hr_attendance_geofence" FOREIGN KEY ("geofence_id")
          REFERENCES "hr_geofences"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_attendance_staff" ON "hr_attendance_records" ("staff_member_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_attendance_status" ON "hr_attendance_records" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_attendance_action" ON "hr_attendance_records" ("action")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_attendance_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_geofences"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_attendance_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_attendance_action_enum"`);
  }
}
