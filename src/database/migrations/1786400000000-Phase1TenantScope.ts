import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — Phase 1 (attendance, homework, timetable, admissions).
 * Har jadvalga `school_id`+`filial_id` (FK + indeks) qo'shadi va backfill qiladi:
 * imkon bo'lsa ota-yozuvdan (student/class/user), qolgani "Yuton School"ga.
 */
export class Phase1TenantScope1786400000000 implements MigrationInterface {
  name = 'Phase1TenantScope1786400000000';

  private readonly tables = [
    'attendance_records',
    'staff_attendance_records',
    'attendance_logs',
    'turnstile_assignments',
    'homework_assignments',
    'homework_submissions',
    'timetable_slots',
    'timetable_templates',
    'timetable_substitutions',
    'timetable_conflicts',
    'admission_applications',
    'admission_decisions',
    'admission_pipelines',
    'admission_stages',
    'entrance_exams',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const t of this.tables) {
      await queryRunner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "school_id" uuid`);
      await queryRunner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "filial_id" uuid`);
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "${t}" ADD CONSTRAINT "fk_${t}_school"
            FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN null; END $$
      `);
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "${t}" ADD CONSTRAINT "fk_${t}_filial"
            FOREIGN KEY ("filial_id") REFERENCES "branches"("id") ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN null; END $$
      `);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_${t}_school" ON "${t}" ("school_id")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_${t}_filial" ON "${t}" ("filial_id")`);
    }

    // Ota-yozuvdan meros (school + filial).
    await queryRunner.query(`UPDATE "attendance_records" a SET "school_id"=s."school_id", "filial_id"=s."filial_id" FROM "students" s WHERE a."student_id"=s."id" AND a."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "staff_attendance_records" a SET "school_id"=u."school_id", "filial_id"=u."branch_id" FROM "users" u WHERE a."user_id"=u."id" AND a."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "homework_assignments" h SET "school_id"=c."school_id", "filial_id"=c."filial_id" FROM "classes" c WHERE h."class_id"=c."id" AND h."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "homework_submissions" h SET "school_id"=s."school_id", "filial_id"=s."filial_id" FROM "students" s WHERE h."student_id"=s."id" AND h."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "timetable_slots" ts SET "school_id"=c."school_id", "filial_id"=c."filial_id" FROM "classes" c WHERE ts."class_id"=c."id" AND ts."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "timetable_templates" tt SET "school_id"=c."school_id", "filial_id"=c."filial_id" FROM "classes" c WHERE tt."class_id"=c."id" AND tt."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "timetable_substitutions" x SET "school_id"=ts."school_id", "filial_id"=ts."filial_id" FROM "timetable_slots" ts WHERE x."slot_id"=ts."id" AND x."school_id" IS NULL`);
    await queryRunner.query(`UPDATE "timetable_conflicts" x SET "school_id"=ts."school_id", "filial_id"=ts."filial_id" FROM "timetable_slots" ts WHERE x."slot_id"=ts."id" AND x."school_id" IS NULL`);

    // Qolgan barcha NULL (polymorphic/root jadvallar) → Yuton School.
    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    if (rows[0]?.id) {
      for (const t of this.tables) {
        await queryRunner.query(`UPDATE "${t}" SET "school_id" = $1 WHERE "school_id" IS NULL`, [rows[0].id]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of this.tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_${t}_filial"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_${t}_school"`);
      await queryRunner.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "fk_${t}_filial"`);
      await queryRunner.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "fk_${t}_school"`);
      await queryRunner.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "filial_id"`);
      await queryRunner.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "school_id"`);
    }
  }
}
