import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "O'qituvchi har doim xodim" modelini DB darajasida mustahkamlaydi:
 *   - `hr_teachers.staff_member_id` → NOT NULL (har bir o'qituvchi bitta xodimga
 *     bog'langan bo'lishi shart);
 *   - bir xodimga faqat bitta faol o'qituvchi to'g'ri kelishi uchun partial
 *     UNIQUE indeks (soft-delete qilinganlar hisobga olinmaydi).
 *
 * Ishga tushirishdan OLDIN `npm run backfill:teacher-staff` bajarilishi kerak —
 * aks holda quyidagi himoya aniq xato bilan to'xtatadi.
 */
export class HrTeacherStaffRequired1785200000000 implements MigrationInterface {
  name = 'HrTeacherStaffRequired1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Himoya: bog'lanmagan o'qituvchi qolgan bo'lsa — tushunarli xato beramiz.
    const rows: Array<{ count: number }> = await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM "hr_teachers" WHERE "staff_member_id" IS NULL`,
    );
    const remaining = rows[0]?.count ?? 0;
    if (remaining > 0) {
      throw new Error(
        `${remaining} ta o'qituvchi hali xodimga bog'lanmagan. Avval "npm run backfill:teacher-staff" ni ishga tushiring, so'ng migratsiyani qayta bajaring.`,
      );
    }

    await queryRunner.query(`ALTER TABLE "hr_teachers" ALTER COLUMN "staff_member_id" SET NOT NULL`);

    // Eski oddiy indeksni noyob (partial) indeks bilan almashtiramiz.
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_hr_teachers_staff"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_hr_teachers_staff_active" ON "hr_teachers" ("staff_member_id") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_hr_teachers_staff_active"`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_teachers_staff" ON "hr_teachers" ("staff_member_id")`,
    );
    await queryRunner.query(`ALTER TABLE "hr_teachers" ALTER COLUMN "staff_member_id" DROP NOT NULL`);
  }
}
