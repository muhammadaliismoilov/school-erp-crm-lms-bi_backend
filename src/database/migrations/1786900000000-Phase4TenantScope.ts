import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ko'p-maktabli ajratish — Phase 4 (yakunlovchi to'plam): HR, CRM, academic
 * ma'lumotnomalari, students bola-jadvallari, finance/transactions
 * ma'lumotnomalari, access-control, notifications, files, audit, workflow,
 * data-jobs, integrations, assets, procurement.
 *
 * Har jadvalga ustun + FK + indeks (Phase1-3 pattern), so'ng NULL yozuvlar
 * "Yuton School"ga backfill qilinadi.
 *
 * Ataylab global qoladiganlar: roles (alohida migratsiya, NULL=global),
 * permissions (katalog), schools (tenant ildizi), user_sessions (user orqali),
 * notification_templates/translations (tizim shablonlari).
 */
export class Phase4TenantScope1786900000000 implements MigrationInterface {
  name = 'Phase4TenantScope1786900000000';

  private readonly tables = [
    // HR
    'hr_teachers', 'hr_candidates', 'hr_vacancies', 'hr_interactions',
    'hr_attendance_records', 'hr_geofences', 'hr_payments', 'hr_payrolls',
    'hr_performance_reviews', 'hr_projects', 'hr_staff_achievements',
    'hr_staff_certificates', 'hr_staff_leaves', 'hr_staff_salary_history',
    'hr_surveys', 'hr_tasks', 'hr_timesheets', 'hr_timesheet_lines',
    'hr_work_schedules', 'hr_work_schedule_days',
    // CRM
    'leads', 'lead_sources', 'lead_tags', 'lead_tasks', 'lead_comments',
    'pipeline_stages', 'crm_lead_applications', 'crm_referrals',
    // Academic ma'lumotnomalari
    'academic_years', 'quarters', 'subjects', 'courses', 'lesson_periods', 'rooms',
    // Students bola-jadvallari
    'student_achievements', 'student_conclusions', 'student_smart_goals',
    'student_parents', 'student_admissions', 'student_documents',
    // Finance / transactions / student-payments ma'lumotnomalari
    'bank_accounts', 'contract_types', 'discounts', 'payment_plans',
    'payment_types', 'transaction_categories', 'transaction_change_requests',
    'payment_plan_configs', 'payment_plan_rates',
    // Access-control (Face ID)
    'access_devices', 'access_events', 'face_profiles',
    // Operatsion modullar
    'notifications', 'notification_preferences',
    'files', 'audit_logs', 'approval_requests', 'data_jobs', 'integrations',
    'fixed_assets', 'asset_depreciations', 'asset_maintenance_tickets',
    'vendors', 'purchase_requests', 'purchase_orders', 'goods_receipts',
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

    // Backfill: mavjud yozuvlar Yuton School'ga (idempotent — faqat NULL).
    const schoolRows: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    const schoolId = schoolRows[0]?.id;
    if (!schoolId) return;
    for (const t of this.tables) {
      await queryRunner.query(
        `UPDATE "${t}" SET "school_id" = $1 WHERE "school_id" IS NULL`,
        [schoolId],
      );
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
