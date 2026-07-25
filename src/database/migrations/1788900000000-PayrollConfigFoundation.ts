import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Payroll poydevori (5a): toifa stavkalari jadvali va oylik siyosati.
 *  - `hr_pay_rate_cards` — toifa → dars stavkasi, `effective_from` bilan tarixli;
 *  - `hr_payroll_settings` — filial darajasida sinf-rahbarlik stavkasi va cheklovi;
 *  - `hr-payroll-config.*` granular ruxsatlar (hr.read/hr.manage soyabonlariga ulanadi).
 */
export class PayrollConfigFoundation1788900000000 implements MigrationInterface {
  name = 'PayrollConfigFoundation1788900000000';

  private readonly perms: Array<{ code: string; action: string; umbrella: 'read' | 'manage' }> = [
    { code: 'hr-payroll-config.read', action: 'read', umbrella: 'read' },
    { code: 'hr-payroll-config.create', action: 'create', umbrella: 'manage' },
    { code: 'hr-payroll-config.update', action: 'update', umbrella: 'manage' },
    { code: 'hr-payroll-config.delete', action: 'delete', umbrella: 'manage' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Toifa stavkalari jadvali (QualificationCategory bilan yagona qiymatlar).
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_pay_rate_cards_category_enum" AS ENUM ('mutaxassis', 'ikkinchi', 'birinchi', 'oliy');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_pay_rate_cards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "category" "hr_pay_rate_cards_category_enum" NOT NULL,
        "rate_per_lesson" numeric(14,2) NOT NULL,
        "effective_from" date NOT NULL,
        "note" text,
        CONSTRAINT "pk_hr_pay_rate_cards" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_pay_rate_cards_scope"
         ON "hr_pay_rate_cards" ("school_id", "filial_id", "category", "effective_from")`,
    );

    // 2) Oylik siyosati sozlamalari (filialga bitta yozuv).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_payroll_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "class_leader_rate" numeric(14,2) NOT NULL DEFAULT 0,
        "max_class_leaderships" integer NOT NULL DEFAULT 3,
        CONSTRAINT "pk_hr_payroll_settings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_hr_payroll_settings_scope"
         ON "hr_payroll_settings" ("school_id", "filial_id")`,
    );

    // 3) Granular ruxsatlar + soyabon rollariga ulash.
    for (const p of this.perms) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, 'hr-payroll-config', $2)
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
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_payroll_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_pay_rate_cards"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_pay_rate_cards_category_enum"`);
  }
}
