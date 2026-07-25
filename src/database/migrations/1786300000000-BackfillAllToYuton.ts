import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Bazadagi barcha ma'lumot Yuton School'ga" — `school_id` ustuni bor HAR QANDAY
 * jadvaldagi NULL yozuvlarni "Yuton School"ga biriktiradi.
 *
 * Istisno: `users` — super-adminlar (school_id NULL) global ko'rish uchun
 * o'zgartirilmaydi. (Boshqa userlar allaqачон oldingi backfillда Yuton'ga o'tgan.)
 *
 * Dinamik: information_schema orqali jadvallarni topadi, shuning uchun kelajakda
 * qo'shilgan tenant jadvallar ham qamraladi. Idempotent (faqat NULL yozuvlar).
 */
export class BackfillAllToYuton1786300000000 implements MigrationInterface {
  name = 'BackfillAllToYuton1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schoolRows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    const schoolId = schoolRows[0]?.id;
    if (!schoolId) return;

    const tables: Array<{ table_name: string }> = await queryRunner.query(
      `SELECT table_name FROM information_schema.columns
       WHERE column_name = 'school_id' AND table_schema = 'public'
         AND table_name <> 'users'`,
    );

    for (const { table_name } of tables) {
      await queryRunner.query(
        `UPDATE "${table_name}" SET "school_id" = $1 WHERE "school_id" IS NULL`,
        [schoolId],
      );
    }
  }

  public async down(): Promise<void> {
    // Qaytarilmaydi — qaysi yozuvlar ilgari NULL bo'lganini aniq bilib bo'lmaydi
    // (xавfsizlik uchun no-op). Kerak bo'lsa qo'lda SQL bilan tuzatiladi.
  }
}
