import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rolga MA'LUMOT DOIRASI ustunini qo'shadi — ruxsat tizimidan alohida qatlam.
 *
 * Ruxsat "qaysi amalni qila oladi", doira esa "qaysi qatorlar ustida" degan
 * savolga javob beradi. `students.read` olgan o'qituvchi shu paytgacha butun
 * maktab o'quvchilarini ko'rardi; `data_scope='own'` roli bilan endi faqat
 * o'z sinflarini (sinf rahbarligi ∪ dars jadvali) ko'radi.
 *
 * Default `all` — mavjud rollarning xulqi ZARRACHA o'zgarmaydi. Toraytirish
 * ataylab qilinadigan amal: administrator Rollar sahifasida doirani `own`
 * ga o'zgartirgandagina kuchga kiradi.
 */
export class RoleDataScope1790000000000 implements MigrationInterface {
  name = 'RoleDataScope1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "data_scope" varchar(16) NOT NULL DEFAULT 'all'`,
    );
    // Faqat ikki qiymat: noto'g'ri satr yozilib qolishi filtrni jimgina
    // "hech nima chegaralamaydi" holatiga tushirib yuborishi mumkin edi.
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "chk_roles_data_scope"
       CHECK ("data_scope" IN ('all', 'own'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "chk_roles_data_scope"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "data_scope"`);
  }
}
