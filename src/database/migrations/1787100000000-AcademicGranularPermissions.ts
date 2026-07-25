import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — "academic" moduli.
 *
 * Qo'pol `academic.read`/`academic.manage` o'rniga 6 resurs (o'quv yillari,
 * choraklar, dars davrlari, fanlar, kurslar, sinflar) × CRUD. Eski kodlar
 * SAQLANADI. Foydalanuvchi yaratgan rollarga eski `.manage`→yozuv,
 * `.read`→resurs `read` grantlari beriladi (idempotent). Tizim rollari
 * `identity-seed`da `expandPermissionCodes` orqali avtomatik yangilanadi.
 *
 * Namuna: [[1787000000000-StudentsGranularPermissions]].
 */
export class AcademicGranularPermissions1787100000000 implements MigrationInterface {
  name = 'AcademicGranularPermissions1787100000000';

  private readonly resources = [
    'academic-years',
    'academic-quarters',
    'academic-lesson-periods',
    'academic-subjects',
    'academic-courses',
    'academic-classes',
  ];

  private get newPermissions(): Array<[string, string, string]> {
    const rows: Array<[string, string, string]> = [];
    for (const module of this.resources) {
      for (const action of ['read', 'create', 'update', 'delete']) {
        rows.push([`${module}.${action}`, module, action]);
      }
    }
    return rows;
  }

  private get writeCodes(): string[] {
    return this.resources.flatMap((m) => [`${m}.create`, `${m}.update`, `${m}.delete`]);
  }

  private get readCodes(): string[] {
    return this.resources.map((m) => `${m}.read`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [code, module, action] of this.newPermissions) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, $2, $3)
         ON CONFLICT ("code") DO NOTHING`,
        [code, module, action],
      );
    }

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id
       FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'academic.manage'
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [this.writeCodes],
    );

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id
       FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'academic.read'
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [this.readCodes],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const allCodes = this.newPermissions.map(([code]) => code);
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = ANY($1))`,
      [allCodes],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = ANY($1)`, [allCodes]);
  }
}
