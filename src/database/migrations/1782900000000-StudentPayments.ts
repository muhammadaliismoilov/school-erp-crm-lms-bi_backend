import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "To'lovlar" (O'quvchi to'lovlari) moduli:
 *  - `student_payments` jadvalini yaratadi (o'quvchi/sinf snapshot, summa, reja,
 *    to'lov turi, kvitansiya raqami, holat).
 *  - To'lov turlari (`payment_types`) allaqachon "Tranzaksiyalar" migratsiyasida
 *    seed qilingan, shuning uchun bu yerda qayta seed kerak emas.
 */
export class StudentPayments1782900000000 implements MigrationInterface {
  name = 'StudentPayments1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "student_payments_status_enum" AS ENUM ('paid', 'partial', 'pending');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "student_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "student_id" uuid,
        "student_name" varchar(160) NOT NULL,
        "class_id" uuid,
        "class_name" varchar(80),
        "amount" numeric(14,2) NOT NULL DEFAULT 0,
        "plan_amount" numeric(14,2),
        "payment_date" date NOT NULL,
        "month" smallint NOT NULL,
        "year" smallint NOT NULL,
        "payment_type_id" uuid,
        "receipt_number" varchar(40) NOT NULL,
        "status" "student_payments_status_enum" NOT NULL DEFAULT 'pending',
        "note" text,
        CONSTRAINT "pk_student_payments" PRIMARY KEY ("id"),
        CONSTRAINT "uq_student_payments_receipt" UNIQUE ("receipt_number"),
        CONSTRAINT "fk_student_payments_student" FOREIGN KEY ("student_id")
          REFERENCES "students"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_student_payments_class" FOREIGN KEY ("class_id")
          REFERENCES "classes"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_student_payments_payment_type" FOREIGN KEY ("payment_type_id")
          REFERENCES "payment_types"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_student_payments_student" ON "student_payments" ("student_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_student_payments_class" ON "student_payments" ("class_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_student_payments_date" ON "student_payments" ("payment_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_student_payments_period" ON "student_payments" ("year", "month")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_student_payments_status" ON "student_payments" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_student_payments_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_student_payments_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_student_payments_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_student_payments_class"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_student_payments_student"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_payments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "student_payments_status_enum"`);
  }
}
