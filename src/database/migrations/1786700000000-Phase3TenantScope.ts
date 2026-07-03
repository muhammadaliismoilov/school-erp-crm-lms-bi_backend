import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — Phase 3 (feedback, gamification, grade-requests, kpi,
 * documents, communication, appeals, parent-comms, youth-services). Ustun + FK +
 * indeks + backfill (student ota'dan, qolgani Yuton School).
 */
export class Phase3TenantScope1786700000000 implements MigrationInterface {
  name = 'Phase3TenantScope1786700000000';

  private readonly tables = [
    'feedback_comments', 'feedback_tickets',
    'badges', 'coin_presets', 'student_coin_transactions', 'student_badges', 'student_coin_wallets',
    'grade_change_requests',
    'kpi_results', 'kpi_metrics',
    'generated_documents', 'document_sign_requests', 'document_templates',
    'message_deliveries', 'message_templates', 'communication_campaigns',
    'appeals', 'appeal_public_links',
    'parent_communications',
    'youth_service_requests', 'youth_meal_menus',
  ];

  /** student_id orqali ota-maktabni oladigan jadvallar. */
  private readonly studentChild = [
    'feedback_tickets',
    'student_coin_transactions', 'student_badges', 'student_coin_wallets',
    'grade_change_requests',
    'parent_communications',
    'youth_service_requests',
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

    // student_id orqali meros.
    for (const t of this.studentChild) {
      await queryRunner.query(
        `UPDATE "${t}" x SET "school_id"=s."school_id", "filial_id"=s."filial_id" FROM "students" s WHERE x."student_id"=s."id" AND x."school_id" IS NULL`,
      );
    }

    // Qolgan NULL → Yuton School.
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
