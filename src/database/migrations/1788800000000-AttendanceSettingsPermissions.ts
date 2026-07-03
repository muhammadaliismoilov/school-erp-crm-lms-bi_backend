import { MigrationInterface, QueryRunner } from 'typeorm';

/** Davomat sozlamalari resursi uchun granular ruxsatlar (attendance umbrella). */
export class AttendanceSettingsPermissions1788800000000 implements MigrationInterface {
  name = 'AttendanceSettingsPermissions1788800000000';

  private readonly perms: Array<{ code: string; action: string; umbrella: 'read' | 'manage' }> = [
    { code: 'attendance-settings.read', action: 'read', umbrella: 'read' },
    { code: 'attendance-settings.update', action: 'update', umbrella: 'manage' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const p of this.perms) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, 'attendance-settings', $2)
         ON CONFLICT ("code") DO NOTHING`,
        [p.code, p.action],
      );
    }
    await this.grant(queryRunner, 'attendance.read', ['attendance-settings.read']);
    await this.grant(queryRunner, 'attendance.manage', ['attendance-settings.update']);
  }

  private async grant(queryRunner: QueryRunner, umbrella: string, codes: string[]): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "role_permissions" ("role_id", "permission_id")
       SELECT rp.role_id, p.id FROM "role_permissions" rp
       JOIN "permissions" old ON old.id = rp.permission_id AND old.code = $2
       JOIN "permissions" p ON p.code = ANY($1)
       ON CONFLICT DO NOTHING`,
      [codes, umbrella],
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
