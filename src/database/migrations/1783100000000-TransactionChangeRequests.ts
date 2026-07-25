import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "O'zgartirish so'rovlari" (Tranzaksiya o'zgartirish so'rovlari) moduli:
 *  - `transaction_change_requests` jadvalini yaratadi (tranzaksiyani tahrirlash
 *    yoki o'chirish so'rovi, holat, ko'rib chiqish izlari).
 */
export class TransactionChangeRequests1783100000000 implements MigrationInterface {
  name = 'TransactionChangeRequests1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "transaction_change_requests_type_enum" AS ENUM ('update', 'delete');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "transaction_change_requests_status_enum" AS ENUM ('pending', 'approved', 'rejected');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transaction_change_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "transaction_id" uuid,
        "request_type" "transaction_change_requests_type_enum" NOT NULL,
        "proposed_changes" jsonb,
        "tx_type" varchar(20),
        "tx_amount" numeric(14,2),
        "tx_date" date,
        "tx_person_name" varchar(160),
        "reason" text NOT NULL,
        "status" "transaction_change_requests_status_enum" NOT NULL DEFAULT 'pending',
        "requested_by_id" uuid,
        "requested_by_name" varchar(160),
        "reviewed_by_id" uuid,
        "reviewed_by_name" varchar(160),
        "reviewed_at" TIMESTAMPTZ,
        "review_note" text,
        "applied" boolean NOT NULL DEFAULT false,
        CONSTRAINT "pk_transaction_change_requests" PRIMARY KEY ("id"),
        CONSTRAINT "fk_tcr_transaction" FOREIGN KEY ("transaction_id")
          REFERENCES "transactions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tcr_status" ON "transaction_change_requests" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tcr_type" ON "transaction_change_requests" ("request_type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tcr_transaction" ON "transaction_change_requests" ("transaction_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tcr_created" ON "transaction_change_requests" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_change_requests"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_change_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_change_requests_type_enum"`);
  }
}
