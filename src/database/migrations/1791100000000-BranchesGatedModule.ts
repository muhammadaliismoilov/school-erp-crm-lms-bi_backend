import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Filiallar bo'limini maktab bayrog'iga bog'laydi.
 *
 * NEGA: ko'p maktabda filial umuman yo'q — o'lchov paytida `users.branch_id`
 * 1194 qatordan 0 tasida to'ldirilgan edi. Shunday maktabda "Filiallar" bo'limi
 * ham, boshqa formalardagi "Filial" maydoni ham bo'sh shovqin bo'lib turardi.
 * Endi bo'limni CEO maktabga alohida yoqadi — integratsiyalar bilan bir xil
 * naqsh.
 *
 * `GATED_MODULES.branches.default = false`, ya'ni yozuv YO'Q bo'lgan maktabda
 * bo'lim yopiq. Shu migratsiya esa filiali BOR maktablarga bayroqni yoqib
 * qo'yadi: aks holda ular ertalab bo'limni yo'qotib, sababini tushunmasdi.
 * Bayroq faqat qo'shiladi — mavjud yozuv (CEO qo'lda o'chirgan bo'lsa)
 * `ON CONFLICT DO NOTHING` bilan tegilmaydi.
 */
export class BranchesGatedModule1791100000000 implements MigrationInterface {
  name = 'BranchesGatedModule1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "school_modules" ("school_id", "module", "enabled", "enabled_at")
      SELECT DISTINCT b."school_id", 'branches', true, now()
      FROM "branches" b
      WHERE b."deleted_at" IS NULL AND b."school_id" IS NOT NULL
      ON CONFLICT ("school_id", "module") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "school_modules" WHERE "module" = 'branches'`);
  }
}
