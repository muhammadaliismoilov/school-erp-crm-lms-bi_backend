import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `students.withdrawal_reason` ustunini qo‘shadi — o‘quvchini o‘chirish (soft-delete)
 * paytida ketish sababi saqlanadi va "Ketgan o‘quvchilar ro‘yxati" sahifasida
 * SABABI ustunida ko‘rsatiladi.
 */
export class StudentWithdrawalReason1782400000000 implements MigrationInterface {
  name = 'StudentWithdrawalReason1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "withdrawal_reason" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN IF EXISTS "withdrawal_reason"`,
    );
  }
}
