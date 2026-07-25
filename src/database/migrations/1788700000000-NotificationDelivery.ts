import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Notifikatsiya yetkazish (Bosqich D):
 *  - `notification_channels` — foydalanuvchi (ota-ona) kanallari (telegram/push);
 *  - `notification_outbox` — ishonchli yetkazish uchun outbox (dedup, retry, quiet).
 */
export class NotificationDelivery1788700000000 implements MigrationInterface {
  name = 'NotificationDelivery1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "notification_channel_type_enum" AS ENUM ('telegram','push');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "notification_status_enum" AS ENUM ('pending','sent','failed','skipped');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "notification_category_enum" AS ENUM
         ('school_entry','school_exit','session_present','session_late','session_absent','session_left_early');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_channels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "user_id" uuid NOT NULL,
        "type" "notification_channel_type_enum" NOT NULL,
        "address" varchar(255) NOT NULL,
        "is_preferred" boolean NOT NULL DEFAULT false,
        "language" varchar(5) NOT NULL DEFAULT 'uz',
        "active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "pk_notification_channels" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_notification_channel_user_type" ON "notification_channels" ("user_id", "type")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "recipient_user_id" uuid NOT NULL,
        "channel" "notification_channel_type_enum" NOT NULL,
        "address" varchar(255) NOT NULL,
        "category" "notification_category_enum" NOT NULL,
        "body" text NOT NULL,
        "payload" jsonb,
        "status" "notification_status_enum" NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "scheduled_at" TIMESTAMPTZ,
        "sent_at" TIMESTAMPTZ,
        "last_error" text,
        "dedup_key" varchar(255),
        CONSTRAINT "pk_notification_outbox" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notification_outbox_due" ON "notification_outbox" ("status", "scheduled_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_notification_outbox_dedup" ON "notification_outbox" ("dedup_key")
         WHERE "dedup_key" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_outbox"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_channels"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_type_enum"`);
  }
}
