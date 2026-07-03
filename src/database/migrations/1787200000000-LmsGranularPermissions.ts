import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — "lms" moduli.
 *
 * Qo'pol `lms.read`/`lms.manage` o'rniga 5 resurs (baholar jurnali, dars
 * jurnali, imtihon natijalari, imtihonlar, dars jadvali). Har resurs FAQAT
 * mavjud endpointlariga mos amallarga ega (mas. gradebook — read/update;
 * journal — read/create/update). Eski kodlar SAQLANADI. Foydalanuvchi yaratgan
 * rollarga eski `.manage`→yozuv, `.read`→resurs `read` grantlari (idempotent).
 * Tizim rollari `identity-seed`da `expandPermissionCodes` orqali yangilanadi.
 */
export class LmsGranularPermissions1787200000000 implements MigrationInterface {
  name = 'LmsGranularPermissions1787200000000';

  /** module -> mavjud amallar. */
  private readonly resourceActions: Record<string, string[]> = {
    'lms-gradebook': ['read', 'update'],
    'lms-journal': ['read', 'create', 'update'],
    'lms-exam-results': ['read', 'create', 'update'],
    'lms-exams': ['read', 'create', 'update', 'delete'],
    'lms-lessons': ['read', 'create', 'update', 'delete'],
  };

  private get newPermissions(): Array<[string, string, string]> {
    return Object.entries(this.resourceActions).flatMap(([module, actions]) =>
      actions.map((action) => [`${module}.${action}`, module, action] as [string, string, string]),
    );
  }

  private get writeCodes(): string[] {
    return this.newPermissions.filter(([, , a]) => a !== 'read').map(([code]) => code);
  }

  private get readCodes(): string[] {
    return this.newPermissions.filter(([, , a]) => a === 'read').map(([code]) => code);
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
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'lms.manage'
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [this.writeCodes],
    );

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id
       FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'lms.read'
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
