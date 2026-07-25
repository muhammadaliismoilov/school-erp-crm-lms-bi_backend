import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Tranzaksiyalar" (Moliya) moduli:
 *  - `payment_types` (To'lov turlari) va `transaction_categories` (To'lov maqsadi)
 *    jadvallarini yaratadi va default qiymatlar bilan seed qiladi.
 *  - Mavjud `transactions` jadvalini UI maydonlari bilan kengaytiradi
 *    (kategoriya, to'lov turi, shaxs, oy/yil, izoh, chek, chegirma, sinf/o'quvchi).
 */
export class TransactionsModule1782800000000 implements MigrationInterface {
  name = 'TransactionsModule1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── payment_types ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "name" varchar(80) NOT NULL,
        "code" varchar(40) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system" boolean NOT NULL DEFAULT false,
        "sort_order" smallint NOT NULL DEFAULT 0,
        CONSTRAINT "pk_payment_types" PRIMARY KEY ("id"),
        CONSTRAINT "uq_payment_types_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_payment_types_active" ON "payment_types" ("is_active")`);

    // ─── transaction_categories ───────────────────────────────────────────
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "transaction_categories_kind_enum" AS ENUM ('income', 'expense', 'both');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transaction_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "name" varchar(120) NOT NULL,
        "kind" "transaction_categories_kind_enum" NOT NULL DEFAULT 'both',
        "parent_id" uuid,
        "is_student_tuition" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system" boolean NOT NULL DEFAULT false,
        "sort_order" smallint NOT NULL DEFAULT 0,
        CONSTRAINT "pk_transaction_categories" PRIMARY KEY ("id"),
        CONSTRAINT "fk_tx_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "transaction_categories"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tx_categories_kind" ON "transaction_categories" ("kind")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tx_categories_parent" ON "transaction_categories" ("parent_id")`);

    // ─── transactions kengaytirish ────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "method" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "source_type" SET DEFAULT 'manual'`);

    const addColumns: string[] = [
      `ADD COLUMN IF NOT EXISTS "purpose_category_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "payment_type_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "person_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "person_name" varchar(160)`,
      `ADD COLUMN IF NOT EXISTS "person_role" varchar(60)`,
      `ADD COLUMN IF NOT EXISTS "month" smallint`,
      `ADD COLUMN IF NOT EXISTS "year" smallint`,
      `ADD COLUMN IF NOT EXISTS "note" text`,
      `ADD COLUMN IF NOT EXISTS "receipt_file_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "discount_percent" numeric(5,2)`,
      `ADD COLUMN IF NOT EXISTS "price" numeric(14,2)`,
      `ADD COLUMN IF NOT EXISTS "class_id" uuid`,
      `ADD COLUMN IF NOT EXISTS "student_id" uuid`,
    ];
    await queryRunner.query(`ALTER TABLE "transactions" ${addColumns.join(', ')}`);

    await queryRunner.query(
      `ALTER TABLE "transactions"
         ADD CONSTRAINT "fk_tx_purpose_category" FOREIGN KEY ("purpose_category_id")
         REFERENCES "transaction_categories"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions"
         ADD CONSTRAINT "fk_tx_payment_type" FOREIGN KEY ("payment_type_id")
         REFERENCES "payment_types"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_transactions_type" ON "transactions" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_transactions_date" ON "transactions" ("date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_transactions_person" ON "transactions" ("person_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_transactions_category" ON "transactions" ("purpose_category_id")`);

    // ─── Seed: to'lov turlari ─────────────────────────────────────────────
    const paymentTypes: Array<[string, string, number]> = [
      ['Naqd', 'cash', 1],
      ['Plastik karta', 'card', 2],
      ['Bank o‘tkazmasi', 'bank', 3],
      ['Click', 'click', 4],
      ['Payme', 'payme', 5],
      ['Uzcard', 'uzcard', 6],
      ['Humo', 'humo', 7],
    ];
    for (const [name, code, sort] of paymentTypes) {
      await queryRunner.query(
        `INSERT INTO "payment_types" ("name", "code", "is_system", "sort_order")
         VALUES ($1, $2, true, $3)
         ON CONFLICT ("code") DO NOTHING`,
        [name, code, sort],
      );
    }

    // ─── Seed: kategoriyalar ──────────────────────────────────────────────
    const categories: Array<[string, 'income' | 'expense' | 'both', boolean, number]> = [
      ['O‘quvchi to‘lovi', 'income', true, 1],
      ['Grant', 'income', false, 2],
      ['Boshqa kirim', 'income', false, 3],
      ['Maosh', 'expense', false, 4],
      ['Ijara', 'expense', false, 5],
      ['Kommunal xizmatlar', 'expense', false, 6],
      ['Jihoz va inventar', 'expense', false, 7],
      ['Boshqa chiqim', 'expense', false, 8],
    ];
    for (const [name, kind, tuition, sort] of categories) {
      await queryRunner.query(
        `INSERT INTO "transaction_categories" ("name", "kind", "is_student_tuition", "is_system", "sort_order")
         SELECT $1::varchar, $2::"transaction_categories_kind_enum", $3::boolean, true, $4::smallint
         WHERE NOT EXISTS (SELECT 1 FROM "transaction_categories" WHERE "name" = $1::varchar)`,
        [name, kind, tuition, sort],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "fk_tx_payment_type"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "fk_tx_purpose_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_person"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_type"`);

    const dropColumns = [
      'purpose_category_id', 'payment_type_id', 'person_id', 'person_name', 'person_role',
      'month', 'year', 'note', 'receipt_file_id', 'discount_percent', 'price', 'class_id', 'student_id',
    ]
      .map((c) => `DROP COLUMN IF EXISTS "${c}"`)
      .join(', ');
    await queryRunner.query(`ALTER TABLE "transactions" ${dropColumns}`);

    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_categories"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_categories_kind_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_types"`);
  }
}
