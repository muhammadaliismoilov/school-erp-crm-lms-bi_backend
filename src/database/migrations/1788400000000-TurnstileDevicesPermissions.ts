import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turniket qurilmalari resursi uchun granular ruxsatlar.
 * read → attendance.read egalariga; create/update/delete → attendance.manage
 * egalariga idempotent grant qilinadi.
 */
export class TurnstileDevicesPermissions1788400000000 implements MigrationInterface {
  name = 'TurnstileDevicesPermissions1788400000000';

  private readonly module = 'turnstile-devices';
  private readonly actions = ['read', 'create', 'update', 'delete'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const action of this.actions) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, $2, $3)
         ON CONFLICT ("code") DO NOTHING`,
        [`${this.module}.${action}`, this.module, action],
      );
    }

    // read → attendance.read rollariga
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'attendance.read'
       JOIN "permissions" p ON p.code = $1
       ON CONFLICT DO NOTHING`,
      [`${this.module}.read`],
    );

    // create/update/delete → attendance.manage rollariga
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = 'attendance.manage'
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [[`${this.module}.create`, `${this.module}.update`, `${this.module}.delete`]],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = this.actions.map((a) => `${this.module}.${a}`);
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = ANY($1))`,
      [codes],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = ANY($1)`, [codes]);
  }
}
