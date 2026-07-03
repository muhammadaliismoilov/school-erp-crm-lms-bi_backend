import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — procurement, assets, advanced-finance, transport,
 * health-safety modullari. Har guruh eski `<module>.read`/`.manage` dan granular
 * resurs kodlarini oladi (idempotent). Eski kodlar SAQLANADI.
 */
export class ProcurementAssetsAdvFinanceTransportHealthGranular1787800000000
  implements MigrationInterface
{
  name = 'ProcurementAssetsAdvFinanceTransportHealthGranular1787800000000';

  private readonly groups: Array<{
    manageCode: string;
    readCode: string;
    resourceActions: Record<string, string[]>;
  }> = [
    {
      manageCode: 'procurement.manage',
      readCode: 'procurement.read',
      resourceActions: {
        'procurement-vendors': ['read', 'create', 'update'],
        'procurement-requests': ['read', 'create', 'update'],
        'procurement-orders': ['read', 'create', 'update'],
        'procurement-receipts': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'assets.manage',
      readCode: 'assets.read',
      resourceActions: {
        'assets-items': ['read', 'create', 'update'],
        'assets-maintenance': ['read', 'create', 'update'],
        'assets-depreciations': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'advanced-finance.manage',
      readCode: 'advanced-finance.read',
      resourceActions: {
        'advanced-finance-invoices': ['read', 'create', 'update'],
        'advanced-finance-scholarships': ['read', 'create', 'update'],
        'advanced-finance-refunds': ['read', 'create', 'update'],
        'advanced-finance-cashboxes': ['read', 'create', 'update'],
        'advanced-finance-bank-transactions': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'transport.manage',
      readCode: 'transport.read',
      resourceActions: {
        'transport-vehicles': ['read', 'create', 'update'],
        'transport-routes': ['read', 'create', 'update'],
        'transport-stops': ['read', 'create', 'update'],
        'transport-assignments': ['read', 'create'],
        'transport-trips': ['read', 'create', 'update'],
      },
    },
    {
      manageCode: 'health-safety.manage',
      readCode: 'health-safety.read',
      resourceActions: {
        'health-safety-records': ['read', 'create', 'update'],
        'health-safety-nurse-visits': ['read', 'create', 'update'],
        'health-safety-incidents': ['read', 'create', 'update'],
        'health-safety-drills': ['read', 'create', 'update'],
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
