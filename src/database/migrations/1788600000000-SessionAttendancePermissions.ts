import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sessiya davomati resurslari uchun granular ruxsatlar.
 * read'lar → attendance.read egalariga; create/update'lar → attendance.manage
 * egalariga idempotent grant qilinadi.
 */
export class SessionAttendancePermissions1788600000000 implements MigrationInterface {
  name = 'SessionAttendancePermissions1788600000000';

  private readonly perms: Array<{ code: string; module: string; action: string; umbrella: 'read' | 'manage' }> = [
    { code: 'class-sessions.read', module: 'class-sessions', action: 'read', umbrella: 'read' },
    { code: 'class-sessions.create', module: 'class-sessions', action: 'create', umbrella: 'manage' },
    { code: 'session-attendance.read', module: 'session-attendance', action: 'read', umbrella: 'read' },
    { code: 'session-attendance.update', module: 'session-attendance', action: 'update', umbrella: 'manage' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const p of this.perms) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, $2, $3)
         ON CONFLICT ("code") DO NOTHING`,
        [p.code, p.module, p.action],
      );
    }

    const readCodes = this.perms.filter((p) => p.umbrella === 'read').map((p) => p.code);
    const manageCodes = this.perms.filter((p) => p.umbrella === 'manage').map((p) => p.code);

    await this.grant(queryRunner, 'attendance.read', readCodes);
    await this.grant(queryRunner, 'attendance.manage', manageCodes);
  }

  private async grant(queryRunner: QueryRunner, umbrellaCode: string, codes: string[]): Promise<void> {
    if (codes.length === 0) return;
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = $2
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [codes, umbrellaCode],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = this.perms.map((p) => p.code);
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = ANY($1))`,
      [codes],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = ANY($1)`, [codes]);
  }
}
