import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — Phase 2 (library, inventory, transport,
 * advanced-finance, counseling, health-safety). Ustun + FK + indeks + backfill
 * (student ota'dan, qolgani Yuton School).
 */
export class Phase2TenantScope1786600000000 implements MigrationInterface {
  name = 'Phase2TenantScope1786600000000';

  private readonly tables = [
    'library_books', 'library_book_copies', 'library_loans', 'library_reservations',
    'inventory_categories', 'inventory_items', 'inventory_transactions',
    'transport_routes', 'transport_route_stops', 'student_transport_assignments', 'transport_trips', 'transport_vehicles',
    'bank_transactions', 'cashboxes', 'finance_invoices', 'refunds', 'scholarships',
    'counseling_sessions',
    'emergency_drills', 'nurse_visits', 'safety_incidents', 'student_health_records',
  ];

  /** student_id orqali ota-maktabни oladigan jadvallar. */
  private readonly studentChild = [
    'library_loans', 'library_reservations', 'student_transport_assignments',
    'finance_invoices', 'refunds', 'scholarships', 'counseling_sessions',
    'nurse_visits', 'student_health_records',
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
