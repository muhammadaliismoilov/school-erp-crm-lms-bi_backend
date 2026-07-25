import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * O'quvchi billing — oylik tarif va chegirma (foiz yoki so'm):
 *  - `monthly_fee` — o'quvchining oylik to'lov tarifi.
 *  - `discount_type` (`percent` | `amount`) + `discount_value` — universal chegirma.
 *  - `billing_start_date` — to'lov hisobi boshlanish sanasi (null bo'lsa created_at).
 *  - Mavjud `discount_percent` qiymati `discount_value`ga ko'chiriladi (back-compat:
 *    ustun qoldiriladi, lekin yangi kod discount_value/type ishlatadi).
 */
export class StudentBilling1782960000000 implements MigrationInterface {
  name = 'StudentBilling1782960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        ADD COLUMN IF NOT EXISTS "monthly_fee" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "discount_type" varchar(10) NOT NULL DEFAULT 'percent',
        ADD COLUMN IF NOT EXISTS "discount_value" numeric(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "billing_start_date" date
    `);

    // Eski foiz chegirmasini yangi universal maydonga ko'chiramiz.
    await queryRunner.query(`
      UPDATE "students"
        SET "discount_value" = "discount_percent", "discount_type" = 'percent'
      WHERE "discount_percent" > 0 AND "discount_value" = 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
        DROP COLUMN IF EXISTS "monthly_fee",
        DROP COLUMN IF EXISTS "discount_type",
        DROP COLUMN IF EXISTS "discount_value",
        DROP COLUMN IF EXISTS "billing_start_date"
    `);
  }
}
