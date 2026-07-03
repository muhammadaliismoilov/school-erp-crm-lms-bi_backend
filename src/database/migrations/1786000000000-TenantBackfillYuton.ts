import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — backfill (yoqish). Mavjud (school_id IS NULL) barcha
 * ma'lumotni asosiy ishlaydigan maktab — "Yuton School"ga biriktiradi, shunda
 * scoping real ishga tushadi.
 *
 * Muhim istisno: `super-admin` rolidagi foydalanuvchilar maktabга BIRIKTIRILMAYDI
 * (school_id null qoladi) — shunda ular hamma maktab ma'lumotini ko'raveradi
 * (null kontekst = filtrsiz). Boshqa foydalanuvchilar Yuton'ga biriktiriladi.
 *
 * Idempotent: faqat NULL yozuvlarga tegadi. "Yuton School" topilmasa — no-op.
 * filial_id/branch_id null qoladi (branches jadvali bo'sh; bosh ofis = null).
 */
export class TenantBackfillYuton1786000000000 implements MigrationInterface {
  name = 'TenantBackfillYuton1786000000000';

  private readonly businessTables = ['hr_staff_members', 'students', 'contracts', 'payments', 'transactions'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    const schoolId = rows[0]?.id;
    if (!schoolId) return; // Yuton School yo'q — hech narsa qilmaymiz.

    // 1) Foydalanuvchilar — super-adminlardan tashqari.
    await queryRunner.query(
      `
      UPDATE "users" SET "school_id" = $1
      WHERE "school_id" IS NULL
        AND "id" NOT IN (
          SELECT ur."user_id" FROM "user_roles" ur
          JOIN "roles" r ON r."id" = ur."role_id"
          WHERE r."name" = 'super-admin'
        )
      `,
      [schoolId],
    );

    // 2) Biznes ma'lumotlari — barcha NULL yozuvlar Yuton'ga.
    for (const table of this.businessTables) {
      await queryRunner.query(`UPDATE "${table}" SET "school_id" = $1 WHERE "school_id" IS NULL`, [schoolId]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Qaytarish: shu maktabга tegishli backfill qiymatlarini bo'shatamiz.
    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    const schoolId = rows[0]?.id;
    if (!schoolId) return;

    await queryRunner.query(`UPDATE "users" SET "school_id" = NULL WHERE "school_id" = $1`, [schoolId]);
    for (const table of this.businessTables) {
      await queryRunner.query(`UPDATE "${table}" SET "school_id" = NULL WHERE "school_id" = $1`, [schoolId]);
    }
  }
}
