import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Egalik (ownership) auditi — "kim yaratdi / kim o'zgartirdi":
 *  - `transactions` va `student_payments` jadvallariga yaratuvchi va oxirgi
 *    o'zgartiruvchi haqidagi snapshot ustunlarini qo'shadi (id + ism + rol).
 *  - Maydonlar nullable: migratsiyadan oldingi eski yozuvlarda egasi noma'lum.
 *  - `created_by` index — egaga ko'ra filtr/tekshiruv tez bo'lishi uchun.
 */
export class OwnershipAudit1782950000000 implements MigrationInterface {
  name = 'OwnershipAudit1782950000000';

  private readonly tables = ['transactions', 'student_payments'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ADD COLUMN IF NOT EXISTS "created_by" uuid,
          ADD COLUMN IF NOT EXISTS "created_by_name" varchar(160),
          ADD COLUMN IF NOT EXISTS "created_by_role" varchar(60),
          ADD COLUMN IF NOT EXISTS "updated_by" uuid,
          ADD COLUMN IF NOT EXISTS "updated_by_name" varchar(160),
          ADD COLUMN IF NOT EXISTS "updated_by_role" varchar(60)
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_created_by" ON "${table}" ("created_by")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_${table}_created_by"`);
      await queryRunner.query(`
        ALTER TABLE "${table}"
          DROP COLUMN IF EXISTS "created_by",
          DROP COLUMN IF EXISTS "created_by_name",
          DROP COLUMN IF EXISTS "created_by_role",
          DROP COLUMN IF EXISTS "updated_by",
          DROP COLUMN IF EXISTS "updated_by_name",
          DROP COLUMN IF EXISTS "updated_by_role"
      `);
    }
  }
}
