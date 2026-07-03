import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Malaka toifasi enum'larini birlashtirish (Contract qadami).
 *
 * `hr_teachers.category` (TeacherCategory: oliy/first/second/special) takroriy edi.
 * Yagona manba — `hr_staff_members.qualification_category`
 * (QualificationCategory: mutaxassis/ikkinchi/birinchi/oliy).
 *
 * Bu migratsiya:
 *   1) Mavjud `hr_teachers.category` qiymatlarini bog'langan xodimga ko'chiradi
 *      (faqat xodimda toifa hali bo'sh bo'lsa — mavjud qiymatni buzmaydi).
 *      Moslik: oliy→oliy, first→birinchi, second→ikkinchi, special→mutaxassis.
 *   2) `hr_teachers.category` ustuni, indeksi va enum turini olib tashlaydi.
 */
export class HrTeacherMergeCategory1785400000000 implements MigrationInterface {
  name = 'HrTeacherMergeCategory1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Qiymatlarni xodimga ko'chirish (idempotent — faqat bo'sh toifalar).
    await queryRunner.query(`
      UPDATE "hr_staff_members" sm
      SET "qualification_category" = (
        CASE t."category"
          WHEN 'oliy' THEN 'oliy'
          WHEN 'first' THEN 'birinchi'
          WHEN 'second' THEN 'ikkinchi'
          WHEN 'special' THEN 'mutaxassis'
        END
      )::"hr_staff_members_qualification_category_enum"
      FROM "hr_teachers" t
      WHERE t."staff_member_id" = sm."id"
        AND t."category" IS NOT NULL
        AND sm."qualification_category" IS NULL
    `);

    // 2) Ortiqcha ustun/indeks/enum turini olib tashlash.
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_hr_teachers_category"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_teachers_category_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Enum turi + ustun + indeksni tiklaymiz. Qiymatlarni teskari ko'chiramiz
    // (mutaxassis→special — yagona mumkin bo'lgan yaqinlashuv; toifasizlar null).
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_teachers_category_enum" AS ENUM ('oliy', 'first', 'second', 'special'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `ALTER TABLE "hr_teachers" ADD COLUMN IF NOT EXISTS "category" "hr_teachers_category_enum"`,
    );
    await queryRunner.query(`
      UPDATE "hr_teachers" t
      SET "category" = (
        CASE sm."qualification_category"
          WHEN 'oliy' THEN 'oliy'
          WHEN 'birinchi' THEN 'first'
          WHEN 'ikkinchi' THEN 'second'
          WHEN 'mutaxassis' THEN 'special'
        END
      )::"hr_teachers_category_enum"
      FROM "hr_staff_members" sm
      WHERE t."staff_member_id" = sm."id"
        AND sm."qualification_category" IS NOT NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_hr_teachers_category" ON "hr_teachers" ("category")`,
    );
  }
}
