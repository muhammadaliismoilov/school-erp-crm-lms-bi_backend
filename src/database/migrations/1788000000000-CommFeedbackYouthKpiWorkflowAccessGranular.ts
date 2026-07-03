import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — communication, feedback, youth-services, kpi, workflow,
 * access-control modullari. Har guruh eski `<module>.read`/`.manage` dan granular
 * resurs kodlarini oladi (idempotent). Eski kodlar SAQLANADI.
 */
export class CommFeedbackYouthKpiWorkflowAccessGranular1788000000000 implements MigrationInterface {
  name = 'CommFeedbackYouthKpiWorkflowAccessGranular1788000000000';

  private readonly groups: Array<{
    manageCode: string;
    readCode: string;
    resourceActions: Record<string, string[]>;
  }> = [
    {
      manageCode: 'communication.manage',
      readCode: 'communication.read',
      resourceActions: {
        'communication-templates': ['read', 'create', 'update'],
        'communication-campaigns': ['read', 'create', 'update'],
        'communication-deliveries': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'feedback.manage',
      readCode: 'feedback.read',
      resourceActions: {
        'feedback-tickets': ['read', 'create', 'update'],
        'feedback-comments': ['read', 'create'],
      },
    },
    {
      manageCode: 'youth.manage',
      readCode: 'youth.read',
      resourceActions: {
        'youth-meal-menus': ['read', 'create', 'update'],
        'youth-requests': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'kpi.manage',
      readCode: 'kpi.read',
      resourceActions: {
        'kpi-metrics': ['read', 'create', 'update'],
        'kpi-results': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'workflow.manage',
      readCode: 'workflow.read',
      resourceActions: { 'workflow-approvals': ['read', 'create', 'update'] },
    },
    {
      manageCode: 'access-control.manage',
      readCode: 'access-control.read',
      resourceActions: {
        'access-control-devices': ['read', 'create', 'update'],
        'access-control-face-profiles': ['read', 'create'],
        'access-control-events': ['read', 'create'],
      },
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
