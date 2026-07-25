import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — "gamification" moduli.
 *
 * 4 resurs: nishonlar (badge — read/create/update), o'quvchi hamyoni
 * (wallet — read), coin tranzaksiyalari (coins — read/create), coin shablonlari
 * (coin-presets — CRUD). Eski `gamification.read`/`.manage` SAQLANADI.
 * Foydalanuvchi rollariga eski `.manage`→yozuv, `.read`→resurs `read` grantlari
 * (idempotent). Tizim rollari `identity-seed`da avtomatik yangilanadi.
 */
export class GamificationGranularPermissions1787300000000 implements MigrationInterface {
  name = 'GamificationGranularPermissions1787300000000';

  private readonly resourceActions: Record<string, string[]> = {
    'gamification-badges': ['read', 'create', 'update'],
    'gamification-wallets': ['read'],
    'gamification-coins': ['read', 'create'],
    'gamification-coin-presets': ['read', 'create', 'update', 'delete'],
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
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'gamification.manage'
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [this.writeCodes],
    );

    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id
       FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'gamification.read'
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
