import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * O'LIK keng `<module>.read` kodlarini tizimdan olib tashlaydi (T-01).
 *
 * Muammo `manage` bilan bir xil edi, faqat teskari tomondan. Granular
 * rolloutdan keyin bu 21 ta kodni BIRONTA endpoint talab qilmay qo'ygan edi —
 * himoya `hr-staff.read` kabi sub-resurs kodlariga ko'chgan. Lekin frontend
 * menyusining 53 darvozasidan 36 tasi hamon shu o'lik kodlarni tekshirardi.
 * Natijada Rollar sahifasida granular HR kataklarini belgilagan admin uchun
 * backend ruxsat berardi-yu, menyu 22 ta HR bo'limini butunlay yashirardi
 * (va teskarisi: faqat `hr.read` belgilansa, menyu ochilib sahifalar bo'sh
 * qaytardi). Endi bazada faqat endpointlar haqiqatan talab qiladigan kodlar
 * qoladi — menyu darvozasi bilan guard bir xil kodni tekshiradi.
 *
 * Qadamlar:
 *  1) `<module>.read` bergan HAR bir rolga o'sha modulning granular read
 *     to'plamini beradi — hech kim ko'rish huquqidan ayrilmaydi;
 *  2) keng kodlarning grantlarini va qatorlarining o'zini o'chiradi.
 *
 * Ro'yxatlar ataylab QOTIRIB yozilgan (1789900000000 bilan bir xil sabab):
 * migratsiya o'tmishdagi holatni aks ettiradi, konstanta keyin o'zgarsa ham.
 *
 * TIRIK keng kodlarga TEGILMAYDI: `students.read`, `finance.read`, `lms.read`,
 * `settings.read`, `roles.read`, `appeals.read`, `documents.read`,
 * `integrations.read`, `data-jobs.read` — bular haqiqiy endpointlarda
 * ishlatiladi va o'z resursining o'qish kodi bo'lib qoladi.
 */
export class DropBroadReadPermissions1790200000000 implements MigrationInterface {
  name = 'DropBroadReadPermissions1790200000000';

  /** O'lik keng kod -> o'sha modulning granular o'qish to'plami. */
  private readonly readBundles: Array<[string, string[]]> = [
    ['notifications.read', ['notification-templates.read']],
    ['communication.read', ['communication-templates.read', 'communication-campaigns.read', 'communication-deliveries.read']],
    ['feedback.read', ['feedback-tickets.read', 'feedback-comments.read']],
    ['youth.read', ['youth-meal-menus.read', 'youth-requests.read']],
    ['kpi.read', ['kpi-metrics.read', 'kpi-results.read']],
    ['workflow.read', ['workflow-approvals.read']],
    ['access-control.read', ['access-control-devices.read', 'access-control-face-profiles.read', 'access-control-events.read']],
    ['procurement.read', ['procurement-vendors.read', 'procurement-requests.read', 'procurement-orders.read', 'procurement-receipts.read']],
    ['assets.read', ['assets-items.read', 'assets-maintenance.read', 'assets-depreciations.read']],
    ['advanced-finance.read', ['advanced-finance-invoices.read', 'advanced-finance-scholarships.read', 'advanced-finance-refunds.read', 'advanced-finance-cashboxes.read', 'advanced-finance-bank-transactions.read']],
    ['transport.read', ['transport-vehicles.read', 'transport-routes.read', 'transport-stops.read', 'transport-assignments.read', 'transport-trips.read']],
    ['health-safety.read', ['health-safety-records.read', 'health-safety-nurse-visits.read', 'health-safety-incidents.read', 'health-safety-drills.read']],
    ['crm.read', ['crm-leads.read', 'crm-lead-comments.read', 'crm-tags.read', 'crm-sources.read', 'crm-referrals.read']],
    ['admissions.read', ['admissions-pipelines.read', 'admissions-stages.read', 'admissions-applications.read', 'admissions-exams.read', 'admissions-decisions.read']],
    ['library.read', ['library-books.read', 'library-copies.read', 'library-loans.read', 'library-reservations.read']],
    ['inventory.read', ['inventory-categories.read', 'inventory-items.read', 'inventory-transactions.read']],
    ['academic.read', ['academic-years.read', 'academic-quarters.read', 'academic-lesson-periods.read', 'academic-subjects.read', 'academic-courses.read', 'academic-classes.read']],
    ['gamification.read', ['gamification-badges.read', 'gamification-wallets.read', 'gamification-coins.read', 'gamification-coin-presets.read']],
    ['attendance.read', ['attendance-records.read', 'turnstile-devices.read', 'class-sessions.read', 'session-attendance.read', 'attendance-settings.read']],
    ['timetable.read', ['timetable-templates.read', 'timetable-slots.read', 'timetable-substitutions.read', 'timetable-conflicts.read']],
    ['hr.read', ['hr-branches.read', 'hr-departments.read', 'hr-positions.read', 'hr-staff.read', 'hr-staff-certificates.read', 'hr-staff-achievements.read', 'hr-leaves.read', 'hr-tasks.read', 'hr-attendance.read', 'hr-payrolls.read', 'hr-payroll-config.read', 'hr-class-leaderships.read', 'hr-holidays.read', 'hr-payroll-adjustments.read', 'hr-candidates.read', 'hr-geofences.read', 'hr-payments.read', 'hr-interactions.read', 'hr-performance-reviews.read', 'hr-projects.read', 'hr-surveys.read', 'hr-teachers.read', 'hr-timesheets.read', 'hr-vacancies.read', 'hr-work-schedules.read', 'hr-statistics.read']],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Grantlarni granular kodlarga ko'chiramiz (idempotent).
    for (const [broadCode, readCodes] of this.readBundles) {
      if (readCodes.length === 0) continue;
      await queryRunner.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT rp.role_id, p.id
         FROM "role_permissions" rp
         JOIN "permissions" old ON old.id = rp.permission_id AND old.code = $1
         JOIN "permissions" p ON p.code = ANY($2)
         ON CONFLICT DO NOTHING`,
        [broadCode, readCodes],
      );
    }

    // 2) Keng kodlarni butunlay olib tashlaymiz.
    const broadCodes = this.readBundles.map(([code]) => code);
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = ANY($1))`,
      [broadCodes],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = ANY($1)`, [broadCodes]);
  }

  /**
   * Qaytarish: keng kodlarni tiklaydi va modulning TO'LIQ granular read
   * to'plamiga ega rollarga qaytaradi — `up()` aynan shunday rollarni hosil
   * qilgan. Granular kodlar o'chirilmaydi: ular endpointlar talab qiladigan
   * haqiqiy kodlar.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [broadCode] of this.readBundles) {
      const [module] = broadCode.split('.');
      await queryRunner.query(
        `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
         VALUES (uuid_generate_v4(), 1, $1, $2, 'read')
         ON CONFLICT ("code") DO NOTHING`,
        [broadCode, module],
      );
    }

    for (const [broadCode, readCodes] of this.readBundles) {
      if (readCodes.length === 0) continue;
      await queryRunner.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT r.id, b.id
         FROM "roles" r
         JOIN "permissions" b ON b.code = $1
         WHERE (
           SELECT COUNT(DISTINCT p.code)
           FROM "role_permissions" rp
           JOIN "permissions" p ON p.id = rp.permission_id
           WHERE rp.role_id = r.id AND p.code = ANY($2)
         ) = $3
         ON CONFLICT DO NOTHING`,
        [broadCode, readCodes, readCodes.length],
      );
    }
  }
}
