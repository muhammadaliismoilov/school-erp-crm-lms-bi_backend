import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RBAC ierarxiyasi — 5-bosqich: rol/imtiyoz boshqaruvi endi faqat
 * director/ceo/super-admin qo'lida.
 *
 * `admin` va `supermanager` shu paytgacha `director` bilan bir xil formula
 * bilan yaratilgan edi — ya'ni ular ham `roles.create`/`roles.update`/
 * `roles.delete`/`roles.assign`ga ega bo'lib, xohlagan foydalanuvchiga
 * xohlagan rolni (Q2 doirasida) yaratib/tayinlay olardi. Bu migratsiya shu
 * to'rt kodni ikkala roldan olib tashlaydi; qolgan barcha operatsion
 * huquqlari (talaba, moliya, HR va h.k. boshqarish) tegilmaydi.
 *
 * `identity-role-sync.ts`dagi rol formulasi ham shu bilan bir vaqtda
 * o'zgartirilgan — aks holda keyingi app boot'da `syncDefaultRoles` bu
 * kodlarni avtomatik qaytarib qo'yardi.
 */
export class AdminSupermanagerDropRoleManagement1790600000000 implements MigrationInterface {
  name = 'AdminSupermanagerDropRoleManagement1790600000000';

  private static readonly ROLE_NAMES = ['admin', 'supermanager'];
  private static readonly CODES = ['roles.create', 'roles.update', 'roles.delete', 'roles.assign'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE role_id IN (
         SELECT id FROM "roles"
         WHERE name = ANY($1) AND school_id IS NULL AND deleted_at IS NULL
       )
       AND permission_id IN (
         SELECT id FROM "permissions" WHERE code = ANY($2)
       )`,
      [AdminSupermanagerDropRoleManagement1790600000000.ROLE_NAMES, AdminSupermanagerDropRoleManagement1790600000000.CODES],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT r.id, p.id
       FROM "roles" r
       CROSS JOIN "permissions" p
       WHERE r.name = ANY($1) AND r.school_id IS NULL AND r.deleted_at IS NULL
         AND p.code = ANY($2)
       ON CONFLICT DO NOTHING`,
      [AdminSupermanagerDropRoleManagement1790600000000.ROLE_NAMES, AdminSupermanagerDropRoleManagement1790600000000.CODES],
    );
  }
}
