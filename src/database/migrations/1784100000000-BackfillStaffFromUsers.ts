import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Foydalanuvchilardagi xodimlarni HR > Xodimlar ro'yxatiga olib chiqish.
 *
 * Avval HR'da xodim yaratilgandagina `hr_staff_members` yozuvi paydo bo'lar edi.
 * Endi student/parent'dan boshqa rolga ega har bir foydalanuvchi xodim
 * hisoblanadi va HR ro'yxatida ko'rinishi kerak. Ushbu migratsiya mavjud
 * xodim-foydalanuvchilar uchun yetishmayotgan `hr_staff_members` yozuvlarini
 * yaratadi (bo'lim/lavozim/maosh bo'sh — keyin HR'da to'ldiriladi).
 *
 * Yangi yaratiladigan foydalanuvchilar UsersService.create() ichidagi
 * ensureStaffMember() orqali avtomatik sinxronlanadi.
 */
export class BackfillStaffFromUsers1784100000000 implements MigrationInterface {
  name = 'BackfillStaffFromUsers1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH existing_max AS (
        SELECT COALESCE(
          MAX(CAST(substring(employee_code FROM '^EMP-([0-9]+)$') AS integer)), 0
        ) AS m
        FROM "hr_staff_members"
        WHERE employee_code ~ '^EMP-[0-9]+$'
      ),
      candidates AS (
        SELECT
          u.id AS user_id,
          u.first_name, u.first_name_cyrillic,
          u.last_name, u.last_name_cyrillic,
          u.middle_name, u.middle_name_cyrillic,
          u.gender, u.birth_date, u.document_number, u.pinfl,
          u.phone, u.email, u.created_at,
          row_number() OVER (ORDER BY u.created_at, u.id) AS rn
        FROM "users" u
        WHERE u.deleted_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM "user_roles" ur
            JOIN "roles" r ON r.id = ur.role_id
            WHERE ur.user_id = u.id
              AND lower(r.name) NOT IN ('student', 'parent')
          )
          AND NOT EXISTS (
            SELECT 1 FROM "hr_staff_members" s WHERE s.user_id = u.id
          )
      )
      INSERT INTO "hr_staff_members" (
        "version", "employee_code", "user_id",
        "first_name", "first_name_cyrillic",
        "last_name", "last_name_cyrillic",
        "middle_name", "middle_name_cyrillic",
        "gender", "birth_date", "passport_series", "pinfl",
        "phone", "email", "hire_date", "status", "salary"
      )
      SELECT
        1,
        'EMP-' || lpad((em.m + c.rn)::text, 4, '0'),
        c.user_id,
        c.first_name, c.first_name_cyrillic,
        c.last_name, c.last_name_cyrillic,
        c.middle_name, c.middle_name_cyrillic,
        c.gender::text::"hr_staff_members_gender_enum",
        c.birth_date, c.document_number, c.pinfl,
        c.phone, c.email,
        COALESCE(c.created_at::date, CURRENT_DATE),
        'active'::"hr_staff_members_status_enum",
        0
      FROM candidates c
      CROSS JOIN existing_max em
    `);
  }

  public async down(): Promise<void> {
    // Backfill — qaytarib bo'lmaydi (HR'da qo'lda kiritilgan ma'lumotlar
    // (bo'lim/lavozim/maosh) bilan aralashib ketmasligi uchun no-op).
  }
}
