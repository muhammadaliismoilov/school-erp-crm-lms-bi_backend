import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `appeals.transfer` — murojaatni boshqa maktabga ko'chirish.
 *
 * Bu amal TENANT CHEGARASINI KESIB O'TADI, shuning uchun kod
 * `CONFIDENTIAL_PERMISSION_CODES` ro'yxatida: direktor/admin/supermanager uni
 * `DEFAULT_PERMISSION_CODES` formulasi orqali avtomatik OLMAYDI. Faqat `ceo`
 * (va matcher orqali texnik super-admin) ega bo'ladi — `users.reassign-school`
 * bilan bir xil siyosat.
 */
export class AppealsTransferPermission1791000000000 implements MigrationInterface {
  name = 'AppealsTransferPermission1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
       VALUES (uuid_generate_v4(), 1, 'appeals.transfer', 'appeals', 'transfer')
       ON CONFLICT ("code") DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT r.id, p.id
       FROM "roles" r
       JOIN "permissions" p ON p.code = 'appeals.transfer'
       WHERE r.name = 'ceo'
       ON CONFLICT DO NOTHING`,
    );
    // Maktab darajasidagi rollarda bu kod QOLMASIN: agar avvalgi keng
    // grantlardan meros bo'lib tushgan bo'lsa, olib tashlaymiz.
    await queryRunner.query(
      `DELETE FROM "role_permissions" rp
       USING "roles" r, "permissions" p
       WHERE rp.role_id = r.id AND rp.permission_id = p.id
         AND p.code = 'appeals.transfer'
         AND r.name IN ('director', 'admin', 'supermanager')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" = 'appeals.transfer')`,
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = 'appeals.transfer'`);
  }
}
