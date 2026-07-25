import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * To'lov rejasi chegirmasi (yaxlit/erta to'lov rag'bati):
 *  - `payment_plan_configs` — maktab darajasidagi config (etalon tarif, fallback oylar).
 *  - `payment_plan_rates` — har config uchun 4 reja chegirmasi (foiz yoki so'm).
 *  - `students` — `payment_plan` (tanlangan reja) + per-student chegirma override.
 *  - Default global config + user misoli rate'lari (2M / 1.3M / 600k / 0) seed qilinadi.
 */
export class PaymentPlans1782970000000 implements MigrationInterface {
  name = 'PaymentPlans1782970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Config jadvali.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_plan_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "academic_year_id" uuid,
        "reference_monthly_fee" numeric(14,2) NOT NULL DEFAULT 0,
        "fallback_months" smallint NOT NULL DEFAULT 10,
        "created_by" uuid,
        "created_by_name" varchar(160),
        "updated_by" uuid,
        "updated_by_name" varchar(160),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "pk_payment_plan_configs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_payment_plan_configs_year" FOREIGN KEY ("academic_year_id")
          REFERENCES "academic_years"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_payment_plan_config_year"
        ON "payment_plan_configs" ("academic_year_id") WHERE "academic_year_id" IS NOT NULL
    `);

    // 2. Rate jadvali.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_plan_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "config_id" uuid NOT NULL,
        "plan_code" varchar(20) NOT NULL,
        "discount_type" varchar(10) NOT NULL DEFAULT 'amount',
        "discount_value" numeric(14,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "pk_payment_plan_rates" PRIMARY KEY ("id"),
        CONSTRAINT "fk_payment_plan_rates_config" FOREIGN KEY ("config_id")
          REFERENCES "payment_plan_configs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_payment_plan_rate"
        ON "payment_plan_rates" ("config_id", "plan_code")
    `);

    // 3. Student ustunlari.
    await queryRunner.query(`
      ALTER TABLE "students"
        ADD COLUMN IF NOT EXISTS "payment_plan" varchar(20),
        ADD COLUMN IF NOT EXISTS "plan_discount_override_type" varchar(10),
        ADD COLUMN IF NOT EXISTS "plan_discount_override_value" numeric(14,2)
    `);

    // 4. Default global config + rate'lar (user misoli).
    await queryRunner.query(`
      WITH cfg AS (
        INSERT INTO "payment_plan_configs" ("reference_monthly_fee", "fallback_months")
        VALUES (1000000, 10)
        RETURNING "id"
      )
      INSERT INTO "payment_plan_rates" ("config_id", "plan_code", "discount_type", "discount_value")
      SELECT cfg."id", v.plan_code, v.discount_type, v.discount_value
      FROM cfg, (VALUES
        ('yearly_1x', 'percent', 10),
        ('split_2',   'percent', 7),
        ('split_3',   'percent', 4),
        ('monthly',   'percent', 0)
      ) AS v(plan_code, discount_type, discount_value)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        DROP COLUMN IF EXISTS "payment_plan",
        DROP COLUMN IF EXISTS "plan_discount_override_type",
        DROP COLUMN IF EXISTS "plan_discount_override_value"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_plan_rates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_plan_configs"`);
  }
}
