import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `appeals.read-assigned` ruxsatini reyestrga qo'shadi.
 *
 * NEGA KERAK: murojaat marshruti qayta qurildi. Ilgari xabar `target_role`
 * bo'yicha o'sha lavozimdagi HAMMA xodimga borardi — sinf rahbari haqidagi
 * shikoyat maktabdagi barcha o'qituvchilarga, murojaat qiluvchining ismi bilan.
 * Ustiga-ustak o'sha xodimlarda `appeals.read` yo'q edi: xabar kelardi-yu,
 * ochib bo'lmasdi. Endi xabar `appeals.read` egalariga (rahbariyat) boradi,
 * ular murojaatni aniq xodimga biriktiradi, va shu ruxsat o'sha xodimga —
 * faqat o'ziga biriktirilganini — ko'rish imkonini beradi.
 *
 * NEGA MIGRATSIYA, boot seed'iga tayanmasdan: `IdentitySeedService` yetishmagan
 * ruxsatlarni o'zi qo'shadi, lekin `DISABLE_BOOTSTRAP_SEED=true` bo'lsa
 * o'tkazib yuboriladi. Migratsiya deploy zanjirida ilovadan OLDIN ishlaydi,
 * ya'ni reyestr qatori har qanday holatda ham bo'ladi.
 *
 * Rollarga bog'lash bu yerda EMAS: default rollar `identity-role-sync` orqali
 * ta'rifga moslashadi (boot va `npm run seed`).
 */
export class AppealsReadAssignedPermission1790800000000 implements MigrationInterface {
  name = 'AppealsReadAssignedPermission1790800000000';

  /** Biriktirilishi mumkin bo'lgan xodim rollari. */
  private readonly assignableRoles = [
    'teacher',
    'accountant',
    'psychologist',
    'sales-manager',
    'manager',
    'tutor',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
       VALUES (uuid_generate_v4(), 1, 'appeals.read-assigned', 'appeals', 'read-assigned')
       ON CONFLICT ("code") DO NOTHING`,
    );

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT r.id, p.id
       FROM "roles" r
       JOIN "permissions" p ON p.code = 'appeals.read-assigned'
       WHERE r.name = ANY($1)
       ON CONFLICT DO NOTHING`,
      [this.assignableRoles],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" = 'appeals.read-assigned')
    `);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = 'appeals.read-assigned'`);
  }
}
