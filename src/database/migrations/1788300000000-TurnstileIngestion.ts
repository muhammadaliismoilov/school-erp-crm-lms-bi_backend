import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turniket ingestion (Bosqich B):
 *  - `attendance_logs` ga idempotentlik va audit ustunlari (idempotency_key,
 *    face_match_confidence, received_at, raw_payload) + partial unique indeks;
 *  - `turnstile_devices` jadvali (qurilma reyestri, API kalit hash'i, tenant).
 */
export class TurnstileIngestion1788300000000 implements MigrationInterface {
  name = 'TurnstileIngestion1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) attendance_logs kengaytmasi.
    await queryRunner.query(`ALTER TABLE "attendance_logs" ADD COLUMN IF NOT EXISTS "received_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "attendance_logs" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(200)`);
    await queryRunner.query(`ALTER TABLE "attendance_logs" ADD COLUMN IF NOT EXISTS "face_match_confidence" real`);
    await queryRunner.query(`ALTER TABLE "attendance_logs" ADD COLUMN IF NOT EXISTS "raw_payload" jsonb`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_attendance_logs_idempotency"
         ON "attendance_logs" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );

    // 2) turnstile_devices jadvali.
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "turnstile_devices_direction_enum" AS ENUM ('in', 'out', 'both');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "turnstile_devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "device_number" varchar(80) NOT NULL,
        "name" varchar(160),
        "api_key_hash" varchar(64) NOT NULL,
        "direction" "turnstile_devices_direction_enum" NOT NULL DEFAULT 'both',
        "active" boolean NOT NULL DEFAULT true,
        "last_seen_at" TIMESTAMPTZ,
        CONSTRAINT "pk_turnstile_devices" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_turnstile_devices_number" ON "turnstile_devices" ("device_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "turnstile_devices"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "turnstile_devices_direction_enum"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_attendance_logs_idempotency"`);
    await queryRunner.query(`ALTER TABLE "attendance_logs" DROP COLUMN IF EXISTS "raw_payload"`);
    await queryRunner.query(`ALTER TABLE "attendance_logs" DROP COLUMN IF EXISTS "face_match_confidence"`);
    await queryRunner.query(`ALTER TABLE "attendance_logs" DROP COLUMN IF EXISTS "idempotency_key"`);
    await queryRunner.query(`ALTER TABLE "attendance_logs" DROP COLUMN IF EXISTS "received_at"`);
  }
}
