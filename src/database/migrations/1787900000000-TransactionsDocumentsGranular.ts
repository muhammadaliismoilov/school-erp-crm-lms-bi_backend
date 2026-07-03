import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — transactions (finance umbrella) va documents modullari.
 *
 * - transactions: transactions/payment-types/categories/change-requests (CRUD)
 *   ← finance.read/manage (moliya umbrella; controllerlar FINANCE_ ishlatgan).
 * - documents: documents (read/create/update — read=mavjud documents.read),
 *   document-templates, document-sign-requests ← documents.read/manage.
 *
 * Eski kodlar SAQLANADI. Idempotent grantlar.
 */
export class TransactionsDocumentsGranular1787900000000 implements MigrationInterface {
  name = 'TransactionsDocumentsGranular1787900000000';

  private readonly groups: Array<{
    manageCode: string;
    readCode: string;
    resourceActions: Record<string, string[]>;
  }> = [
    {
      manageCode: 'finance.manage',
      readCode: 'finance.read',
      resourceActions: {
        transactions: ['read', 'create', 'update', 'delete'],
        'transaction-payment-types': ['read', 'create', 'update', 'delete'],
        'transaction-categories': ['read', 'create', 'update', 'delete'],
        'transaction-change-requests': ['read', 'create', 'update', 'delete'],
      },
    },
    {
      manageCode: 'documents.manage',
      readCode: 'documents.read',
      resourceActions: {
        // 'documents.read' allaqachon mavjud — faqat create/update qo'shiladi
        documents: ['create', 'update'],
        'document-templates': ['read', 'create', 'update'],
        'document-sign-requests': ['read', 'create', 'update'],
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
