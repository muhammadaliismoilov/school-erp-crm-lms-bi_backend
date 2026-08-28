import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Maktab darajasidagi modul bayroqlari.
 *
 * NEGA KERAK: ba'zi bo'limlar (birinchi navbatda "Integratsiyalar") hamma
 * maktabga emas, faqat CEO tanlaganlariga ochilishi kerak. Ruxsat orqali buni
 * qilib bo'lmaydi: `director` — GLOBAL rol (`school_id IS NULL`), ya'ni bitta
 * maktab direktoriga kod berish HAMMA maktab direktoriga berish demakdir.
 * Shuning uchun bayroq maktab darajasida saqlanadi.
 *
 * `enabled_by` ATAYLAB FK emas: foydalanuvchi o'chirilsa ham "kim yoqqan"
 * tarixi qolishi kerak (audit qiymati), qatorni yo'qotib qo'ymaslik uchun.
 *
 * Yozuv YO'QLIGI — "kodda ko'rsatilgan default" degani (integratsiyalar uchun
 * o'chiq). Shu sabab migratsiya hech qanday qator qo'shmaydi: mavjud 4 maktab
 * ham integratsiyani yopiq holda uyg'onadi, bu talabning aynan o'zi.
 */
export class SchoolModules1790700000000 implements MigrationInterface {
  name = 'SchoolModules1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "school_modules" (
        "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"   uuid        NOT NULL,
        "module"      varchar(64) NOT NULL,
        "enabled"     boolean     NOT NULL DEFAULT false,
        "enabled_by"  uuid        NULL,
        "enabled_at"  timestamptz NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_school_modules" PRIMARY KEY ("id"),
        CONSTRAINT "fk_school_modules_school" FOREIGN KEY ("school_id")
          REFERENCES "schools"("id") ON DELETE CASCADE
      )
    `);

    // Har maktabda har modul bo'yicha bitta qator.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_school_modules_school_module"
        ON "school_modules" ("school_id", "module")
    `);

    // "Qaysi maktablarda X yoqilgan?" — tarif/hisob-kitob so'rovlari uchun.
    await queryRunner.query(`
      CREATE INDEX "idx_school_modules_module_enabled"
        ON "school_modules" ("module", "enabled")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_school_modules_module_enabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_school_modules_school_module"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "school_modules"`);
  }
}
