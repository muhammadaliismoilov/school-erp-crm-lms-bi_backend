import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sinf rahbarligi biriktiruvlari (5b): teacher ↔ class, sanali (proporsional
 * to'lov asosi). `hr-class-leaderships.*` granular ruxsatlar bilan.
 */
export class ClassLeaderAssignments1789000000000 implements MigrationInterface {
  name = 'ClassLeaderAssignments1789000000000';

  private readonly perms: Array<{ code: string; action: string; umbrella: 'read' | 'manage' }> = [
    { code: 'hr-class-leaderships.read', action: 'read', umbrella: 'read' },
    { code: 'hr-class-leaderships.create', action: 'create', umbrella: 'manage' },
    { code: 'hr-class-leaderships.update', action: 'update', umbrella: 'manage' },
    { code: 'hr-class-leaderships.delete', action: 'delete', umbrella: 'manage' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_class_leader_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "school_id" uuid,
        "filial_id" uuid,
        "teacher_id" uuid NOT NULL,
        "class_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date,
        "note" text,
        CONSTRAINT "pk_hr_class_leader_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_hr_cla_teacher" FOREIGN KEY ("teacher_id")
          REFERENCES "hr_teachers"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_hr_cla_class" FOREIGN KEY ("class_id")
          REFERENCES "classes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_cla_teacher" ON "hr_class_leader_assignments" ("teacher_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_cla_class" ON "hr_class_leader_assignments" ("class_id")`,
    );
    // Bitta sinfda bir vaqtda faqat bitta ochiq (end_date IS NULL) rahbarlik.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_hr_cla_class_open"
         ON "hr_class_leader_assignments" ("class_id")
         WHERE "end_date" IS NULL AND "deleted_at" IS NULL`,
    );

    for (const p of this.perms) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, 'hr-class-leaderships', $2)
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
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_class_leader_assignments"`);
  }
}
