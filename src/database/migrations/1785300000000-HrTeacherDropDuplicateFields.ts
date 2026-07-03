import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "O'qituvchi = xodim" refactorining OXIRGI (contract) qadami.
 *
 * Shaxsiy ma'lumot endi faqat `hr_staff_members` da saqlanadi (yagona manba),
 * o'qish/yozish/qidiruv to'liq shu yerga o'tkazilgan. Shuning uchun
 * `hr_teachers` dagi takror ustunlarni butunlay olib tashlaymiz.
 *
 * DIQQAT: bu qadam ma'lumotni o'chiradi (qaytarib bo'lmaydi). `down` ustunlarni
 * qayta yaratadi, lekin ichidagi qiymatlarni tiklay olmaydi.
 */
export class HrTeacherDropDuplicateFields1785300000000 implements MigrationInterface {
  name = 'HrTeacherDropDuplicateFields1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "first_name"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "last_name"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "middle_name"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "gender"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "birth_date"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "document_number"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "pinfl"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" DROP COLUMN IF EXISTS "email"`);
    // Gender uchun avtomatik yaratilgan enum tipini ham tozalaymiz.
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_teachers_gender_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "hr_teachers_gender_enum" AS ENUM ('male', 'female')`,
    );
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "first_name" varchar(80) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "last_name" varchar(80) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "middle_name" varchar(80)`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "gender" "hr_teachers_gender_enum"`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "birth_date" date`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "document_number" varchar(32)`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "pinfl" varchar(14)`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "phone" varchar(20)`);
    await queryRunner.query(`ALTER TABLE "hr_teachers" ADD COLUMN "email" varchar(120)`);
  }
}
