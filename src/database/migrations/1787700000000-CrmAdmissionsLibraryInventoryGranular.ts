import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — crm, admissions, library, inventory modullari.
 *
 * Har guruh eski `<module>.read`/`.manage` dan granular resurs kodlarini oladi
 * (idempotent). Eski kodlar SAQLANADI. Tizim rollari `identity-seed`da yangilanadi.
 */
export class CrmAdmissionsLibraryInventoryGranular1787700000000 implements MigrationInterface {
  name = 'CrmAdmissionsLibraryInventoryGranular1787700000000';

  private readonly groups: Array<{
    manageCode: string;
    readCode: string;
    resourceActions: Record<string, string[]>;
  }> = [
    {
      manageCode: 'crm.manage',
      readCode: 'crm.read',
      resourceActions: {
        'crm-leads': ['read', 'create', 'update', 'delete'],
        'crm-lead-comments': ['read', 'create', 'update', 'delete'],
        'crm-tags': ['read', 'create', 'update', 'delete'],
        'crm-sources': ['read', 'create', 'update', 'delete'],
        'crm-referrals': ['read', 'create', 'update', 'delete'],
      },
    },
    {
      manageCode: 'admissions.manage',
      readCode: 'admissions.read',
      resourceActions: {
        'admissions-pipelines': ['read', 'create', 'update'],
        'admissions-stages': ['read', 'create', 'update'],
        'admissions-applications': ['read', 'create', 'update'],
        'admissions-exams': ['read', 'create', 'update'],
        'admissions-decisions': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'library.manage',
      readCode: 'library.read',
      resourceActions: {
        'library-books': ['read', 'create', 'update'],
        'library-copies': ['read', 'create', 'update'],
        'library-loans': ['read', 'create', 'update'],
        'library-reservations': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'inventory.manage',
      readCode: 'inventory.read',
      resourceActions: {
        'inventory-categories': ['read', 'create', 'update'],
        'inventory-items': ['read', 'create', 'update'],
        'inventory-transactions': ['read', 'create'],
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
