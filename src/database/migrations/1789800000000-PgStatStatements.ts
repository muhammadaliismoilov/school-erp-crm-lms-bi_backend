import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * O'lchov qatlami (docs/postgres-senior-plan.md, 1.1-band).
 *
 * `pg_stat_statements` — qaysi so'rov jami eng ko'p vaqt yeyayotganini ko'rsatadi.
 * Aybdor odatda "eng sekin" so'rov emas, "o'rtacha, lekin juda tez-tez
 * chaqiriladigan" so'rov bo'lib chiqadi — buni faqat shu kengaytma ko'rsatadi.
 *
 * Shart: `shared_preload_libraries` da `pg_stat_statements` bo'lishi kerak
 * (docker-compose.yml / docker-compose.prod.yml da sozlangan). Kengaytma
 * yuklanmagan bo'lsa CREATE EXTENSION xato beradi — migratsiya bunday holatda
 * yiqilmaydi, faqat ogohlantirish yozadi, chunki o'lchov qatlami biznes-mantiq
 * uchun majburiy emas.
 */
export class PgStatStatements1789800000000 implements MigrationInterface {
  name = 'PgStatStatements1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"`);
    } catch (error) {
      // Masalan, boshqariladigan hostingda superuser huquqi yo'q yoki
      // shared_preload_libraries hali sozlanmagan.
      // eslint-disable-next-line no-console
      console.warn(
        '[PgStatStatements] Kengaytma yaratilmadi — shared_preload_libraries va huquqlarni tekshiring:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pg_stat_statements"`);
  }
}
