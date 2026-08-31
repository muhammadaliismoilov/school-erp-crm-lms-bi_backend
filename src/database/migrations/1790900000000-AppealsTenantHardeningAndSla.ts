import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Murojaatlar jadvalini qattiqlashtirish: tenant chegarasi, anonimlik, muddat,
 * va so'rov naqshiga mos indekslar.
 *
 * 1. `public_link_id` — murojaat qaysi havoladan kelganini SAQLAYDI. Ilgari bu
 *    yozilmagani uchun egasiz qolgan qatorni havolasiga bog'lab bo'lmasdi, ya'ni
 *    uni qaysi maktabga tiklashni aniqlashning yo'li yo'q edi.
 *
 * 2. `school_id` NOT NULL + FK. `f320e97` gacha public murojaat `school_id`siz
 *    tushardi: `applyTenantScope` faqat qiymat bor bo'lsa filtr qo'yadi, ya'ni
 *    egasiz qator maktab direktoriga KO'RINMAY qolardi va faqat "Barcha
 *    maktablar" rejimidagi CEO'ga chiqardi. Kod tuzatildi; bu esa uni baza
 *    darajasida qulflaydi — xato qaytsa, jim sizib ketish o'rniga darhol yiqiladi.
 *    Migratsiya egasiz qator topsa ATAYLAB to'xtaydi: qaysi maktabniki ekanini
 *    faqat odam biladi. Mavjud FK `ON DELETE SET NULL` edi — NOT NULL bilan
 *    ziddiyat, shuning uchun RESTRICT ga o'tkaziladi.
 *
 * 3. Anonimlik. Shikoyat qiluvchi ota-ona ismini yozishdan qo'rqishi mumkin —
 *    `full_name`/`phone` endi ixtiyoriy. `CHECK` esa oraliq holatni taqiqlaydi:
 *    yo anonim, yo ikkalasi ham to'ldirilgan (6-bob: NOT NULL bo'sh satrdan
 *    himoya qilmaydi, shart kerak bo'lsa CHECK yoziladi).
 *
 * 4. `due_at` — muddat. GENERATED ustun BO'LA OLMAYDI: `timestamptz + interval`
 *    STABLE, IMMUTABLE emas ("generation expression is not immutable"), shuning
 *    uchun oddiy ustun va service to'ldiradi.
 *
 * 5. Indekslar (10-bob: "tenglik ustunlari oldinga, diapazon/tartib ustunlari
 *    oxirga"). Jadvalda 8 ta BIR USTUNLI indeks bor edi va birortasi ham asosiy
 *    so'rovga (`school_id` + `status` + `created_at DESC`) xizmat qilmasdi.
 *    Olib tashlanadiganlar:
 *      - `idx_appeals_school`  — yangi kompozitning chap prefiksi, ortiqcha;
 *      - `idx_appeals_status`  — kompozit qamrab oladi;
 *      - `idx_appeals_type`, `idx_appeals_target_role` — bular doim tenant
 *        filtri BILAN birga keladigan past selektivlikdagi filtrlar;
 *      - `idx_appeals_phone`   — qidiruv `ILIKE '%...%'`, B-Tree bunga
 *        umuman kira olmaydi, ya'ni indeks faqat yozuvga yuk edi;
 *      - `idx_appeals_assignee` — `(school_id, assignee_user_id)` bilan
 *        almashtiriladi, chunki qamrov doim maktab ichida hisoblanadi.
 *    `idx_appeals_filial` tegilmaydi — bu o'zgarish doirasidan tashqarida.
 */
export class AppealsTenantHardeningAndSla1790900000000 implements MigrationInterface {
  name = 'AppealsTenantHardeningAndSla1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. Manba havolasi ---
    await queryRunner.query(`ALTER TABLE "appeals" ADD COLUMN "public_link_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "appeals"
      ADD CONSTRAINT "fk_appeals_public_link"
      FOREIGN KEY ("public_link_id") REFERENCES "appeal_public_links" ("id") ON DELETE SET NULL
    `);

    // --- 2. Tenant chegarasi ---
    const orphans = (await queryRunner.query(
      `SELECT count(*)::text AS count FROM "appeals" WHERE "school_id" IS NULL`,
    )) as { count: string }[];
    const orphanCount = Number(orphans[0]?.count ?? '0');
    if (orphanCount > 0) {
      throw new Error(
        `Migratsiya to'xtatildi: ${orphanCount} ta murojaatda school_id yo'q. ` +
          'Bu qatorlar qaysi maktabga tegishli ekanini avtomatik aniqlab bo\'lmaydi ' +
          '(manba havolasi saqlanmagan). Ularni qo\'lda biriktiring yoki arxivlang, ' +
          'so\'ng migratsiyani qayta ishga tushiring.',
      );
    }
    await queryRunner.query(`ALTER TABLE "appeals" ALTER COLUMN "school_id" SET NOT NULL`);
    // FK allaqachon bor, lekin `ON DELETE SET NULL` bilan — bu NOT NULL bilan
    // ZIDDIYATDA: maktab o'chirilsa Postgres NULL qo'ymoqchi bo'lib yiqilardi,
    // ya'ni xatolik o'chirish paytida, tushunarsiz joyda chiqardi. RESTRICT
    // niyatni aniq aytadi: murojaatlari bor maktab o'chirilmaydi.
    await queryRunner.query(`ALTER TABLE "appeals" DROP CONSTRAINT "fk_appeals_school"`);
    await queryRunner.query(`
      ALTER TABLE "appeals"
      ADD CONSTRAINT "fk_appeals_school"
      FOREIGN KEY ("school_id") REFERENCES "schools" ("id") ON DELETE RESTRICT
    `);

    // --- 3. Anonimlik ---
    await queryRunner.query(`ALTER TABLE "appeals" ALTER COLUMN "full_name" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "appeals" ALTER COLUMN "phone" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "appeals" ADD COLUMN "is_anonymous" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      ALTER TABLE "appeals"
      ADD CONSTRAINT "chk_appeals_identity"
      CHECK ("is_anonymous" OR ("full_name" IS NOT NULL AND "phone" IS NOT NULL))
    `);

    // --- 4. Muddat ---
    await queryRunner.query(`ALTER TABLE "appeals" ADD COLUMN "due_at" timestamptz`);
    await queryRunner.query(`
      UPDATE "appeals"
      SET "due_at" = "created_at" + CASE WHEN "type" = 'complaint'
        THEN interval '3 days' ELSE interval '7 days' END
      WHERE "due_at" IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "appeals" ALTER COLUMN "due_at" SET NOT NULL`);

    // --- 5. Indekslar ---
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_school"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_target_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_assignee"`);

    await queryRunner.query(`
      CREATE INDEX "idx_appeals_inbox"
      ON "appeals" ("school_id", "status", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_appeals_assignee_scope"
      ON "appeals" ("school_id", "assignee_user_id")
    `);
    // Partial: cron faqat OCHIQ murojaatlarni skanerlaydi — yopilganlar
    // (vaqt o'tishi bilan jadvalning katta qismi) indeksga umuman kirmaydi.
    await queryRunner.query(`
      CREATE INDEX "idx_appeals_overdue"
      ON "appeals" ("due_at")
      WHERE "status" IN ('pending', 'in_progress') AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_overdue"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_assignee_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appeals_inbox"`);
    await queryRunner.query(`CREATE INDEX "idx_appeals_assignee" ON "appeals" ("assignee_user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_appeals_phone" ON "appeals" ("phone")`);
    await queryRunner.query(`CREATE INDEX "idx_appeals_target_role" ON "appeals" ("target_role")`);
    await queryRunner.query(`CREATE INDEX "idx_appeals_type" ON "appeals" ("type")`);
    await queryRunner.query(`CREATE INDEX "idx_appeals_status" ON "appeals" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_appeals_school" ON "appeals" ("school_id")`);

    await queryRunner.query(`ALTER TABLE "appeals" DROP COLUMN "due_at"`);
    await queryRunner.query(`ALTER TABLE "appeals" DROP CONSTRAINT "chk_appeals_identity"`);
    await queryRunner.query(`ALTER TABLE "appeals" DROP COLUMN "is_anonymous"`);
    await queryRunner.query(`UPDATE "appeals" SET "phone" = '' WHERE "phone" IS NULL`);
    await queryRunner.query(`UPDATE "appeals" SET "full_name" = '' WHERE "full_name" IS NULL`);
    await queryRunner.query(`ALTER TABLE "appeals" ALTER COLUMN "phone" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "appeals" ALTER COLUMN "full_name" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "appeals" DROP CONSTRAINT "fk_appeals_school"`);
    await queryRunner.query(`ALTER TABLE "appeals" ALTER COLUMN "school_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "appeals"
      ADD CONSTRAINT "fk_appeals_school"
      FOREIGN KEY ("school_id") REFERENCES "schools" ("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`ALTER TABLE "appeals" DROP CONSTRAINT "fk_appeals_public_link"`);
    await queryRunner.query(`ALTER TABLE "appeals" DROP COLUMN "public_link_id"`);
  }
}
