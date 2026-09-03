import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `DashboardOverviewService` — CEO/ega ko'rinishida `school_id` filtri
 * bo'lmasa ham, direktor ko'rinishida HAR doim `school_id = X` bilan keladi
 * (leads haftalik trend, class_sessions bugungi/7-kunlik holat). Mavjud
 * indekslar bu ikkalasiga ham xizmat qilmasdi:
 *
 *   idx_leads_status                    — faqat status, school_id yo'q
 *   idx_class_sessions_class_date/
 *   idx_class_sessions_teacher_date      — school_id yo'q, date faqat 2-ustun
 *
 * Hozircha jadvallar kichik (lokal: 665/0 qator) — ta'siri sezilmaydi, lekin
 * maktablar soni o'sganda (har doim school_id kesimida so'ralgani uchun)
 * kerak bo'ladi. 10-bob: tenglik ustunlari (school_id) oldinga, diapazon/
 * filtr (created_at, date, status) keyinga.
 *
 * `CONCURRENTLY` — production'da jadval bloklanmasin (shu sabab migratsiya
 * tranzaksiyasiz, pastdagi `transaction = false`).
 */
export class DashboardQueryIndexes1791300000000 implements MigrationInterface {
  name = 'DashboardQueryIndexes1791300000000';
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_leads_school_created" ON "leads" ("school_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_class_sessions_school_date_status" ON "class_sessions" ("school_id", "date", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_leads_school_created"`);
    await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_class_sessions_school_date_status"`);
  }
}
