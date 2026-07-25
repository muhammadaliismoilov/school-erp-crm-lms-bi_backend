import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — "students" moduli pilot.
 *
 * Eski qo'pol `students.read` / `students.manage` o'rniga resurs-darajali
 * granular kodlar kiritiladi (o'quvchi CRUD + ota-ona bog'lanishi + hujjatlar).
 * `students.manage` va `students.read` kodlari SAQLANADI (orqaga moslik va UI
 * "hammasini tanlash" qulayligi uchun) — faqat controllerlar endi granular
 * kodni talab qiladi.
 *
 * 1) Yangi permission qatorlarini idempotent qo'shadi (seed ham qo'shadi, lekin
 *    migratsiya bootdan oldin ishlagani uchun bu yerda ham kafolatlaymiz).
 * 2) FOYDALANUVCHI YARATGAN (maxsus) rollar seed bilan qayta yozilmaydi — shu
 *    sabab eski `students.manage` bergan har rolga yangi yozuv kodlarini, eski
 *    `students.read` bergan rolga sub-resurs `read` kodlarini beradi. Shunda
 *    hech kim ruxsatdan ayrilmaydi (izolyatsiya/kirish buzilmaydi).
 *
 * Tizim rollari (director/admin/teacher/...) `identity-seed` orqali
 * `expandPermissionCodes` bilan avtomatik yangilanadi — bu yerda tegilmaydi.
 */
export class StudentsGranularPermissions1787000000000 implements MigrationInterface {
  name = 'StudentsGranularPermissions1787000000000';

  /** Yangi granular kodlar: [code, module, action]. */
  private readonly newPermissions: Array<[string, string, string]> = [
    ['students.create', 'students', 'create'],
    ['students.update', 'students', 'update'],
    ['students.delete', 'students', 'delete'],
    ['student-parents.read', 'student-parents', 'read'],
    ['student-parents.create', 'student-parents', 'create'],
    ['student-parents.delete', 'student-parents', 'delete'],
    ['student-documents.read', 'student-documents', 'read'],
    ['student-documents.create', 'student-documents', 'create'],
    ['student-documents.delete', 'student-documents', 'delete'],
  ];

  private readonly writeCodes = [
    'students.create',
    'students.update',
    'students.delete',
    'student-parents.create',
    'student-parents.delete',
    'student-documents.create',
    'student-documents.delete',
  ];

  private readonly readCodes = ['student-parents.read', 'student-documents.read'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Yangi permission qatorlari (idempotent — code bo'yicha unikal indeks bor).
    for (const [code, module, action] of this.newPermissions) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, $2, $3)
         ON CONFLICT ("code") DO NOTHING`,
        [code, module, action],
      );
    }

    // 2a) `students.manage` bergan rollarga yozuv granular kodlarini beramiz.
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id
       FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'students.manage'
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [this.writeCodes],
    );

    // 2b) `students.read` bergan rollarga sub-resurs `read` kodlarini beramiz.
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id
       FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'students.read'
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [this.readCodes],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const allCodes = this.newPermissions.map(([code]) => code);
    // Grantlarni va yangi permission qatorlarini olib tashlaymiz.
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = ANY($1))`,
      [allCodes],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = ANY($1)`, [allCodes]);
  }
}
