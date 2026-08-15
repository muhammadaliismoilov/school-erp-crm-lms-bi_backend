import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-02 (imtiyoz oshirish) tuzatishining DB qismi.
 *
 * `PATCH /users/:id` shu paytgacha `users.update` bilan parol tiklash va rol
 * biriktirishni ham qabul qilardi — ya'ni profil tahrirchisi istalgan
 * akkauntni (parolini almashtirib) egallashi mumkin edi. Endpointlar endi
 * ajratildi; parol tiklash uchun alohida `users.reset-password` kodi kerak.
 *
 * Migratsiya yangi kodni `users.update` ga ega BARCHA rollarga beradi:
 * bugungi admin/direktor hech qanday imkoniyatdan ayrilmaydi — faqat endi
 * bu imkoniyat alohida kod bo'lib, Rollar sahifasida alohida katak bilan
 * boshqariladi (va service qatlamida Q2 qism-to'plam qoidasi amal qiladi).
 */
export class UsersResetPasswordPermission1790100000000 implements MigrationInterface {
  name = 'UsersResetPasswordPermission1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
       VALUES (uuid_generate_v4(), 1, 'users.reset-password', 'users', 'reset-password')
       ON CONFLICT ("code") DO NOTHING`,
    );

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id
       FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'users.update'
       JOIN "permissions" p ON p.code = 'users.reset-password'
       ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = 'users.reset-password')`,
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = 'users.reset-password'`);
  }
}
