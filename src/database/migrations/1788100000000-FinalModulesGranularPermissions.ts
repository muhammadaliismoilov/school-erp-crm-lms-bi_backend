import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — yakuniy batch: notifications, appeals, integrations,
 * settings, roles, data-jobs (imports-exports), grade-requests (LMS umbrella),
 * parent-communications (students umbrella).
 *
 * Ba'zi resurslar mavjud `<module>.read` ni qayta ishlatadi (appeals, integrations,
 * roles, data-jobs). Idempotent. Eski kodlar SAQLANADI.
 */
export class FinalModulesGranularPermissions1788100000000 implements MigrationInterface {
  name = 'FinalModulesGranularPermissions1788100000000';

  private readonly groups: Array<{
    manageCode: string;
    readCode: string;
    resourceActions: Record<string, string[]>;
  }> = [
    {
      manageCode: 'notifications.manage',
      readCode: 'notifications.read',
      resourceActions: {
        'notification-templates': ['read', 'create'],
        'notification-queue': ['create'],
      },
    },
    {
      manageCode: 'appeals.manage',
      readCode: 'appeals.read',
      resourceActions: {
        appeals: ['create', 'update', 'delete'],
        'appeals-public-link': ['read', 'create'],
      },
    },
    {
      manageCode: 'integrations.manage',
      readCode: 'integrations.read',
      resourceActions: { integrations: ['create', 'update', 'delete'] },
    },
    {
      manageCode: 'settings.manage',
      readCode: 'settings.read',
      resourceActions: {
        'settings-school': ['read', 'update'],
        'settings-rooms': ['read', 'create', 'update', 'delete'],
      },
    },
    {
      manageCode: 'roles.manage',
      readCode: 'roles.read',
      resourceActions: { roles: ['create', 'update', 'delete'] },
    },
    {
      manageCode: 'data-jobs.manage',
      readCode: 'data-jobs.read',
      resourceActions: { 'data-jobs': ['create', 'update'] },
    },
    {
      manageCode: 'lms.manage',
      readCode: 'lms.read',
      resourceActions: { 'grade-requests': ['read', 'create', 'update', 'delete'] },
    },
    {
      manageCode: 'students.manage',
      readCode: 'students.read',
      resourceActions: { 'parent-communications': ['read', 'create', 'update', 'delete'] },
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const group of this.groups) {
      const rows = Object.entries(group.resourceActions).flatMap(([module, actions]) =>
        actions.map((action) => [`${module}.${action}`, module, action] as [string, string, string]),
      );
      for (const [code, module, action] of rows) {
        await queryRunner.query(
          `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
           VALUES (uuid_generate_v4(), 1, $1, $2, $3)
           ON CONFLICT ("code") DO NOTHING`,
          [code, module, action],
        );
      }
      const writeCodes = rows.filter(([, , a]) => a !== 'read').map(([code]) => code);
      const readCodes = rows.filter(([, , a]) => a === 'read').map(([code]) => code);
      if (writeCodes.length) {
        await queryRunner.query(
          `INSERT INTO "role_permissions" ("role_id", "permission_id")
           SELECT rp.role_id, p.id FROM "role_permissions" rp
           JOIN "permissions" old ON old.id = rp.permission_id AND old.code = $2
           JOIN "permissions" p ON p.code = ANY($1)
           ON CONFLICT DO NOTHING`,
          [writeCodes, group.manageCode],
        );
      }
      if (readCodes.length) {
        await queryRunner.query(
          `INSERT INTO "role_permissions" ("role_id", "permission_id")
           SELECT rp.role_id, p.id FROM "role_permissions" rp
           JOIN "permissions" old ON old.id = rp.permission_id AND old.code = $2
           JOIN "permissions" p ON p.code = ANY($1)
           ON CONFLICT DO NOTHING`,
          [readCodes, group.readCode],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const allCodes = this.groups.flatMap((g) =>
      Object.entries(g.resourceActions).flatMap(([m, actions]) => actions.map((a) => `${m}.${a}`)),
    );
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = ANY($1))`,
      [allCodes],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = ANY($1)`, [allCodes]);
  }
}
