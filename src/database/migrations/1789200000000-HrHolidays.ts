import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ish kalendari (5d): `hr_holidays` — bayram/dam olish kunlari. Payroll
 * dvigateli oklad xodimning kunlik stavkasini (oylik ÷ ish kunlari) shu
 * jadval asosida hisoblaydi. `hr-holidays.*` granular ruxsatlar bilan.
 */
export class HrHolidays1789200000000 implements MigrationInterface {
  name = 'HrHolidays1789200000000';

  private readonly perms: Array<{ code: string; action: string; umbrella: 'read' | 'manage' }> = [
    { code: 'hr-holidays.read', action: 'read', umbrella: 'read' },
    { code: 'hr-holidays.create', action: 'create', umbrella: 'manage' },
    { code: 'hr-holidays.update', action: 'update', umbrella: 'manage' },
    { code: 'hr-holidays.delete', action: 'delete', umbrella: 'manage' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_holidays" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "date" date NOT NULL,
        "name" character varying(160) NOT NULL,
        CONSTRAINT "pk_hr_holidays" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_holidays_date" ON "hr_holidays" ("date")`);

    for (const p of this.perms) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, 'hr-holidays', $2)
         ON CONFLICT ("code") DO NOTHING`,
        [p.code, p.action],
      );
    }
    await this.grant(queryRunner, 'hr.read', this.perms.filter((p) => p.umbrella === 'read').map((p) => p.code));
    await this.grant(queryRunner, 'hr.manage', this.perms.filter((p) => p.umbrella === 'manage').map((p) => p.code));
  }

  private async grant(queryRunner: QueryRunner, umbrella: string, codes: string[]): Promise<void> {
    if (codes.length === 0) return;
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
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_holidays"`);
  }
}
