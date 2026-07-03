import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — "hr" moduli (eng katta: 22 resurs, 84 kod).
 *
 * Resurslar: branches, departments, positions, staff, staff-certificates,
 * staff-achievements, leaves, tasks, attendance, payrolls, candidates, geofences,
 * payments, interactions, performance-reviews, projects, surveys, teachers,
 * timesheets, vacancies, work-schedules (CRUD), statistics (read).
 *
 * Eski `hr.read`/`hr.manage` SAQLANADI. Foydalanuvchi rollariga eski `.manage`→
 * yozuv, `.read`→resurs `read` grantlari (idempotent). Tizim rollari
 * `identity-seed`da `expandPermissionCodes` orqali avtomatik yangilanadi.
 */
export class HrGranularPermissions1787600000000 implements MigrationInterface {
  name = 'HrGranularPermissions1787600000000';

  private readonly resourceActions: Record<string, string[]> = {
    'hr-branches': ['read', 'create', 'update', 'delete'],
    'hr-departments': ['read', 'create', 'update', 'delete'],
    'hr-positions': ['read', 'create', 'update', 'delete'],
    'hr-staff': ['read', 'create', 'update', 'delete'],
    'hr-staff-certificates': ['read', 'create', 'update', 'delete'],
    'hr-staff-achievements': ['read', 'create', 'update', 'delete'],
    'hr-leaves': ['read', 'create', 'update', 'delete'],
    'hr-tasks': ['read', 'create', 'update', 'delete'],
    'hr-attendance': ['read', 'create', 'update', 'delete'],
    'hr-payrolls': ['read', 'create', 'update'],
    'hr-candidates': ['read', 'create', 'update', 'delete'],
    'hr-geofences': ['read', 'create', 'update', 'delete'],
    'hr-payments': ['read', 'create', 'update', 'delete'],
    'hr-interactions': ['read', 'create', 'update', 'delete'],
    'hr-performance-reviews': ['read', 'create', 'update', 'delete'],
    'hr-projects': ['read', 'create', 'update', 'delete'],
    'hr-surveys': ['read', 'create', 'update', 'delete'],
    'hr-teachers': ['read', 'create', 'update', 'delete'],
    'hr-timesheets': ['read', 'create', 'update', 'delete'],
    'hr-vacancies': ['read', 'create', 'update', 'delete'],
    'hr-work-schedules': ['read', 'create', 'update', 'delete'],
    'hr-statistics': ['read'],
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
       SELECT rp.role_id, p.id FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'hr.manage'
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [this.writeCodes],
    );

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'hr.read'
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
