import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `<module>.manage` tushunchasini tizimdan BUTUNLAY olib tashlaydi.
 *
 * Muammo: keng `manage` kodi hech qachon granular kodlarga yoyilmas edi —
 * `RolesService.resolvePermissions()` foydalanuvchi belgilagan kodni aynan
 * saqlaydi. Natijada Rollar sahifasida "Boshqarish" katagini belgilagan admin
 * hech qanday yozuv huquqini olmasdi (guardlar granular kodni talab qiladi),
 * ya'ni UI jimgina yolg'on gapirardi. Bundan buyon bazada faqat granular
 * `<resurs>.<amal>` kodlari bo'ladi — belgilangan katak = beriladigan huquq.
 *
 * Qadamlar:
 *  1) Yangi granular kodlarni idempotent qo'shadi (manage o'rnini bosuvchilar).
 *  2) `<module>.manage` bergan HAR bir rolga o'sha modulning to'liq yozuv
 *     to'plamini beradi — hech kim huquqdan ayrilmaydi.
 *  3) `manage` grantlarini va permission qatorlarini o'chiradi.
 *
 * Ro'yxatlar bu yerda ataylab QOTIRIB yozilgan: migratsiya bir marta ishlaydi
 * va o'tmishdagi holatni aks ettirishi kerak. `WRITE_BUNDLES` konstantasiga
 * bog'lansa, keyinchalik konstanta o'zgarganda bu migratsiyaning ma'nosi ham
 * orqaga qarab o'zgarib ketardi.
 */
export class DropManagePermissions1789900000000 implements MigrationInterface {
  name = 'DropManagePermissions1789900000000';

  /** `manage` o'rnini bosuvchi YANGI kodlar: [code, module, action]. */
  private readonly newPermissions: Array<[string, string, string]> = [
    ['settings-school.create', 'settings-school', 'create'],
    ['settings-school.delete', 'settings-school', 'delete'],
    ['roles.assign', 'roles', 'assign'],
    ['student-achievements.create', 'student-achievements', 'create'],
    ['student-achievements.update', 'student-achievements', 'update'],
    ['student-achievements.delete', 'student-achievements', 'delete'],
    ['student-reports.update', 'student-reports', 'update'],
    ['counseling.create', 'counseling', 'create'],
    ['counseling.update', 'counseling', 'update'],
    ['student-payments.create', 'student-payments', 'create'],
    ['student-payments.update', 'student-payments', 'update'],
    ['student-payments.delete', 'student-payments', 'delete'],
    ['student-payments.reconcile', 'student-payments', 'reconcile'],
    ['student-payment-plans.update', 'student-payment-plans', 'update'],
  ];

  /** Eski keng kod -> o'sha modulning to'liq granular yozuv to'plami. */
  private readonly manageBundles: Array<[string, string[]]> = [
    ['academic.manage', ['academic-years.create', 'academic-years.update', 'academic-years.delete', 'academic-quarters.create', 'academic-quarters.update', 'academic-quarters.delete', 'academic-lesson-periods.create', 'academic-lesson-periods.update', 'academic-lesson-periods.delete', 'academic-subjects.create', 'academic-subjects.update', 'academic-subjects.delete', 'academic-courses.create', 'academic-courses.update', 'academic-courses.delete', 'academic-classes.create', 'academic-classes.update', 'academic-classes.delete']],
    ['access-control.manage', ['access-control-devices.create', 'access-control-devices.update', 'access-control-face-profiles.create', 'access-control-events.create']],
    ['admissions.manage', ['admissions-pipelines.create', 'admissions-pipelines.update', 'admissions-stages.create', 'admissions-stages.update', 'admissions-applications.create', 'admissions-applications.update', 'admissions-exams.create', 'admissions-exams.update', 'admissions-decisions.create', 'admissions-decisions.update']],
    ['advanced-finance.manage', ['advanced-finance-invoices.create', 'advanced-finance-invoices.update', 'advanced-finance-scholarships.create', 'advanced-finance-scholarships.update', 'advanced-finance-refunds.create', 'advanced-finance-refunds.update', 'advanced-finance-cashboxes.create', 'advanced-finance-cashboxes.update', 'advanced-finance-bank-transactions.create', 'advanced-finance-bank-transactions.update']],
    ['appeals.manage', ['appeals.create', 'appeals.update', 'appeals.delete', 'appeals-public-link.create']],
    ['assets.manage', ['assets-items.create', 'assets-items.update', 'assets-maintenance.create', 'assets-maintenance.update', 'assets-depreciations.create', 'assets-depreciations.update']],
    ['attendance.manage', ['attendance-records.create', 'turnstile-devices.create', 'turnstile-devices.update', 'turnstile-devices.delete', 'class-sessions.create', 'session-attendance.update', 'attendance-settings.update']],
    ['communication.manage', ['communication-templates.create', 'communication-templates.update', 'communication-campaigns.create', 'communication-campaigns.update', 'communication-deliveries.create', 'communication-deliveries.update']],
    ['counseling.manage', ['counseling.create', 'counseling.update']],
    ['crm.manage', ['crm-leads.create', 'crm-leads.update', 'crm-leads.delete', 'crm-lead-comments.create', 'crm-lead-comments.update', 'crm-lead-comments.delete', 'crm-tags.create', 'crm-tags.update', 'crm-tags.delete', 'crm-sources.create', 'crm-sources.update', 'crm-sources.delete', 'crm-referrals.create', 'crm-referrals.update', 'crm-referrals.delete']],
    ['data-jobs.manage', ['data-jobs.create', 'data-jobs.update']],
    ['documents.manage', ['documents.create', 'documents.update', 'document-templates.create', 'document-templates.update', 'document-sign-requests.create', 'document-sign-requests.update']],
    ['feedback.manage', ['feedback-tickets.create', 'feedback-tickets.update', 'feedback-comments.create']],
    ['finance.manage', ['finance-contracts.create', 'finance-payments.create', 'finance-teacher-rates.update', 'finance-salaries.update', 'student-payments.create', 'student-payments.update', 'student-payments.delete', 'student-payments.reconcile', 'student-payment-plans.update', 'transactions.create', 'transactions.update', 'transactions.delete', 'transaction-payment-types.create', 'transaction-payment-types.update', 'transaction-payment-types.delete', 'transaction-categories.create', 'transaction-categories.update', 'transaction-categories.delete', 'transaction-change-requests.create', 'transaction-change-requests.update', 'transaction-change-requests.delete']],
    ['gamification.manage', ['gamification-badges.create', 'gamification-badges.update', 'gamification-coins.create', 'gamification-coin-presets.create', 'gamification-coin-presets.update', 'gamification-coin-presets.delete']],
    ['health-safety.manage', ['health-safety-records.create', 'health-safety-records.update', 'health-safety-nurse-visits.create', 'health-safety-nurse-visits.update', 'health-safety-incidents.create', 'health-safety-incidents.update', 'health-safety-drills.create', 'health-safety-drills.update']],
    ['hr.manage', ['hr-branches.create', 'hr-branches.update', 'hr-branches.delete', 'hr-departments.create', 'hr-departments.update', 'hr-departments.delete', 'hr-positions.create', 'hr-positions.update', 'hr-positions.delete', 'hr-staff.create', 'hr-staff.update', 'hr-staff.delete', 'hr-staff-certificates.create', 'hr-staff-certificates.update', 'hr-staff-certificates.delete', 'hr-staff-achievements.create', 'hr-staff-achievements.update', 'hr-staff-achievements.delete', 'hr-leaves.create', 'hr-leaves.update', 'hr-leaves.delete', 'hr-tasks.create', 'hr-tasks.update', 'hr-tasks.delete', 'hr-attendance.create', 'hr-attendance.update', 'hr-attendance.delete', 'hr-payrolls.create', 'hr-payrolls.update', 'hr-payroll-config.create', 'hr-payroll-config.update', 'hr-payroll-config.delete', 'hr-class-leaderships.create', 'hr-class-leaderships.update', 'hr-class-leaderships.delete', 'hr-staff-kpi.update', 'hr-holidays.create', 'hr-holidays.update', 'hr-holidays.delete', 'hr-payroll-adjustments.create', 'hr-payroll-adjustments.update', 'hr-payroll-adjustments.delete', 'hr-candidates.create', 'hr-candidates.update', 'hr-candidates.delete', 'hr-geofences.create', 'hr-geofences.update', 'hr-geofences.delete', 'hr-payments.create', 'hr-payments.update', 'hr-payments.delete', 'hr-interactions.create', 'hr-interactions.update', 'hr-interactions.delete', 'hr-performance-reviews.create', 'hr-performance-reviews.update', 'hr-performance-reviews.delete', 'hr-projects.create', 'hr-projects.update', 'hr-projects.delete', 'hr-surveys.create', 'hr-surveys.update', 'hr-surveys.delete', 'hr-teachers.create', 'hr-teachers.update', 'hr-teachers.delete', 'hr-timesheets.create', 'hr-timesheets.update', 'hr-timesheets.delete', 'hr-vacancies.create', 'hr-vacancies.update', 'hr-vacancies.delete', 'hr-work-schedules.create', 'hr-work-schedules.update', 'hr-work-schedules.delete']],
    ['integrations.manage', ['integrations.create', 'integrations.update', 'integrations.delete']],
    ['inventory.manage', ['inventory-categories.create', 'inventory-categories.update', 'inventory-items.create', 'inventory-items.update', 'inventory-transactions.create']],
    ['kpi.manage', ['kpi-metrics.create', 'kpi-metrics.update', 'kpi-results.create', 'kpi-results.update']],
    ['library.manage', ['library-books.create', 'library-books.update', 'library-copies.create', 'library-copies.update', 'library-loans.create', 'library-loans.update', 'library-reservations.create', 'library-reservations.update']],
    ['lms.manage', ['lms-gradebook.update', 'lms-journal.create', 'lms-journal.update', 'lms-exam-results.create', 'lms-exam-results.update', 'lms-exams.create', 'lms-exams.update', 'lms-exams.delete', 'lms-lessons.create', 'lms-lessons.update', 'lms-lessons.delete', 'homework-assignments.create', 'homework-assignments.update', 'homework-submissions.create', 'homework-submissions.update', 'grade-requests.create', 'grade-requests.update', 'grade-requests.delete']],
    ['notifications.manage', ['notification-templates.create', 'notification-queue.create']],
    ['procurement.manage', ['procurement-vendors.create', 'procurement-vendors.update', 'procurement-requests.create', 'procurement-requests.update', 'procurement-orders.create', 'procurement-orders.update', 'procurement-receipts.create', 'procurement-receipts.update']],
    ['roles.manage', ['roles.create', 'roles.update', 'roles.delete', 'roles.assign']],
    ['settings.manage', ['settings-school.create', 'settings-school.update', 'settings-school.delete', 'settings-rooms.create', 'settings-rooms.update', 'settings-rooms.delete']],
    ['students.manage', ['students.create', 'students.update', 'students.delete', 'student-parents.create', 'student-parents.delete', 'student-documents.create', 'student-documents.delete', 'parent-communications.create', 'parent-communications.update', 'parent-communications.delete', 'student-achievements.create', 'student-achievements.update', 'student-achievements.delete', 'student-reports.update']],
    ['timetable.manage', ['timetable-templates.create', 'timetable-templates.update', 'timetable-slots.create', 'timetable-slots.update', 'timetable-substitutions.create', 'timetable-substitutions.update', 'timetable-conflicts.create', 'timetable-conflicts.update']],
    ['transport.manage', ['transport-vehicles.create', 'transport-vehicles.update', 'transport-routes.create', 'transport-routes.update', 'transport-stops.create', 'transport-stops.update', 'transport-assignments.create', 'transport-trips.create', 'transport-trips.update']],
    ['workflow.manage', ['workflow-approvals.create', 'workflow-approvals.update']],
    ['youth.manage', ['youth-meal-menus.create', 'youth-meal-menus.update', 'youth-requests.create', 'youth-requests.update']],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Yangi kodlar (code ustunida unikal indeks bor — ON CONFLICT xavfsiz).
    for (const [code, module, action] of this.newPermissions) {
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, $2, $3)
         ON CONFLICT ("code") DO NOTHING`,
        [code, module, action],
      );
    }

    // 2) Har bir manage grantini o'sha modulning yozuv to'plamiga ko'chiramiz.
    //    Tizim rollari ham, foydalanuvchi yaratgan maxsus rollar ham qamraladi.
    for (const [manageCode, writeCodes] of this.manageBundles) {
      await queryRunner.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT rp.role_id, p.id
         FROM "role_permissions" rp
         JOIN "permissions" old ON old.id = rp.permission_id AND old.code = $1
         JOIN "permissions" p ON p.code = ANY($2)
         ON CONFLICT DO NOTHING`,
        [manageCode, writeCodes],
      );
    }

    // 3) manage grantlari va kodlarining o'zini olib tashlaymiz.
    const manageCodes = this.manageBundles.map(([code]) => code);
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = ANY($1))`,
      [manageCodes],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = ANY($1)`, [manageCodes]);
  }

  /**
   * Qaytarish: `manage` qatorlarini tiklaydi va uni modulning TO'LIQ yozuv
   * to'plamiga ega rollarga qaytaradi — `up()` aynan shunday rollarni hosil
   * qilgan, shuning uchun konvertatsiya qilinganlar uchun bu aniq teskari amal.
   * Yangi qo'shilgan granular kodlar (1-qadam) o'chirilmaydi: ular endpointlar
   * talab qiladigan haqiqiy kodlar, ularsiz tizim ishlamay qoladi.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [manageCode] of this.manageBundles) {
      const [module] = manageCode.split('.');
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, $2, 'manage')
         ON CONFLICT ("code") DO NOTHING`,
        [manageCode, module],
      );
    }

    for (const [manageCode, writeCodes] of this.manageBundles) {
      await queryRunner.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT r.id, m.id
         FROM "roles" r
         JOIN "permissions" m ON m.code = $1
         WHERE (
           SELECT COUNT(DISTINCT p.code)
           FROM "role_permissions" rp
           JOIN "permissions" p ON p.id = rp.permission_id
           WHERE rp.role_id = r.id AND p.code = ANY($2)
         ) = $3
         ON CONFLICT DO NOTHING`,
        [manageCode, writeCodes, writeCodes.length],
      );
    }
  }
}
