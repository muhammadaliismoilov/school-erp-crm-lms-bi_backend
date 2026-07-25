import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Payroll poydevorining yakuni (5e):
 *  - `hr_payrolls.status` enumiga `pending_approval` va `locked` qo'shiladi
 *    (holat mashinasi: draft → pending_approval → approved → paid → locked);
 *  - `hr_payroll_items` — itemized komponent qatorlari (payslip);
 *  - `hr_payroll_adjustments` — qo'lda bonus/jarima (sabab majburiy);
 *  - `hr-payroll-adjustments.*` granular ruxsatlar.
 */
export class PayrollItemsAdjustments1789300000000 implements MigrationInterface {
  name = 'PayrollItemsAdjustments1789300000000';

  private readonly perms: Array<{ code: string; action: string; umbrella: 'read' | 'manage' }> = [
    { code: 'hr-payroll-adjustments.read', action: 'read', umbrella: 'read' },
    { code: 'hr-payroll-adjustments.create', action: 'create', umbrella: 'manage' },
    { code: 'hr-payroll-adjustments.update', action: 'update', umbrella: 'manage' },
    { code: 'hr-payroll-adjustments.delete', action: 'delete', umbrella: 'manage' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Holat mashinasi uchun yangi statuslar.
    await queryRunner.query(
      `ALTER TYPE "public"."hr_payrolls_status_enum" ADD VALUE IF NOT EXISTS 'pending_approval'`,
    );
    await queryRunner.query(`ALTER TYPE "public"."hr_payrolls_status_enum" ADD VALUE IF NOT EXISTS 'locked'`);

    // 2) Itemized komponent qatorlari.
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_payroll_items_type_enum" AS ENUM
         ('base_salary', 'lesson_pay', 'class_leader', 'kpi_bonus', 'manual_bonus', 'penalty', 'absence_deduction', 'retro_adjustment');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_payroll_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "payroll_id" uuid NOT NULL,
        "type" "hr_payroll_items_type_enum" NOT NULL,
        "quantity" numeric(10,2),
        "rate" numeric(14,2),
        "amount" numeric(14,2) NOT NULL,
        "note" text,
        "source_ref" jsonb,
        CONSTRAINT "pk_hr_payroll_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_hr_payroll_items_payroll" FOREIGN KEY ("payroll_id")
          REFERENCES "hr_payrolls"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_payroll_items_payroll" ON "hr_payroll_items" ("payroll_id")`,
    );

    // 3) Qo'lda bonus/jarima yozuvlari.
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_payroll_adjustments_type_enum" AS ENUM ('bonus', 'penalty');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_payroll_adjustments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "staff_member_id" uuid NOT NULL,
        "period" character varying(7) NOT NULL,
        "type" "hr_payroll_adjustments_type_enum" NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "reason" text NOT NULL,
        "created_by_id" uuid,
        CONSTRAINT "pk_hr_payroll_adjustments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_hr_padj_staff" FOREIGN KEY ("staff_member_id")
          REFERENCES "hr_staff_members"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_padj_staff_period" ON "hr_payroll_adjustments" ("staff_member_id", "period")`,
    );

    // 4) Granular ruxsatlar.
    for (const p of this.perms) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, 'hr-payroll-adjustments', $2)
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
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_payroll_adjustments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_payroll_adjustments_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_payroll_items"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_payroll_items_type_enum"`);
    // Eslatma: Postgres enum'dan qiymat olib tashlashni qo'llamaydi —
    // 'pending_approval'/'locked' qiymatlari down'da qoldiriladi (zararsiz).
  }
}
