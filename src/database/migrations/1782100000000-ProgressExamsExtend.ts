import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Progress imtihonlar moduli: `lms_exams` jadvalini sinf + kurs imtihonini
 * qo'llab-quvvatlaydigan qilib kengaytiradi.
 */
export class ProgressExamsExtend1782100000000 implements MigrationInterface {
  name = 'ProgressExamsExtend1782100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enumlar
    await queryRunner.query(`CREATE TYPE "public"."lms_exams_exam_kind_enum" AS ENUM('class', 'course')`);
    await queryRunner.query(`CREATE TYPE "public"."lms_exams_exam_type_enum" AS ENUM('test', 'control_work', 'dictation')`);

    // Yangi ustunlar
    await queryRunner.query(
      `ALTER TABLE "lms_exams" ADD "exam_kind" "public"."lms_exams_exam_kind_enum" NOT NULL DEFAULT 'class'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_exams" ADD "exam_type" "public"."lms_exams_exam_type_enum" NOT NULL DEFAULT 'test'`,
    );
    await queryRunner.query(`ALTER TABLE "lms_exams" ADD "teacher_id" uuid`);
    await queryRunner.query(`ALTER TABLE "lms_exams" ADD "course_id" uuid`);
    await queryRunner.query(`ALTER TABLE "lms_exams" ADD "quarter_id" uuid`);
    await queryRunner.query(`ALTER TABLE "lms_exams" ADD "available_from" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "lms_exams" ADD "available_until" TIMESTAMP WITH TIME ZONE`);

    // title 120 -> 160; class_id/subject_id endi nullable
    await queryRunner.query(`ALTER TABLE "lms_exams" ALTER COLUMN "title" TYPE character varying(160)`);
    await queryRunner.query(`ALTER TABLE "lms_exams" ALTER COLUMN "class_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "lms_exams" ALTER COLUMN "subject_id" DROP NOT NULL`);

    // Indekslar
    await queryRunner.query(`CREATE INDEX "idx_lms_exams_course" ON "lms_exams" ("course_id")`);
    await queryRunner.query(`CREATE INDEX "idx_lms_exams_quarter" ON "lms_exams" ("quarter_id")`);
    await queryRunner.query(`CREATE INDEX "idx_lms_exams_kind" ON "lms_exams" ("exam_kind")`);
    await queryRunner.query(`CREATE INDEX "idx_lms_exams_status" ON "lms_exams" ("status")`);

    // Tashqi kalitlar
    await queryRunner.query(
      `ALTER TABLE "lms_exams" ADD CONSTRAINT "FK_lms_exams_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_exams" ADD CONSTRAINT "FK_lms_exams_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lms_exams" ADD CONSTRAINT "FK_lms_exams_quarter" FOREIGN KEY ("quarter_id") REFERENCES "quarters"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP CONSTRAINT "FK_lms_exams_quarter"`);
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP CONSTRAINT "FK_lms_exams_course"`);
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP CONSTRAINT "FK_lms_exams_teacher"`);

    await queryRunner.query(`DROP INDEX "public"."idx_lms_exams_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_lms_exams_kind"`);
    await queryRunner.query(`DROP INDEX "public"."idx_lms_exams_quarter"`);
    await queryRunner.query(`DROP INDEX "public"."idx_lms_exams_course"`);

    // class_id/subject_id ni NOT NULL ga qaytarish (faqat ma'lumot mavjud bo'lsa ishlaydi)
    await queryRunner.query(`ALTER TABLE "lms_exams" ALTER COLUMN "subject_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "lms_exams" ALTER COLUMN "class_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "lms_exams" ALTER COLUMN "title" TYPE character varying(120)`);

    await queryRunner.query(`ALTER TABLE "lms_exams" DROP COLUMN "available_until"`);
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP COLUMN "available_from"`);
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP COLUMN "quarter_id"`);
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP COLUMN "course_id"`);
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP COLUMN "teacher_id"`);
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP COLUMN "exam_type"`);
    await queryRunner.query(`ALTER TABLE "lms_exams" DROP COLUMN "exam_kind"`);

    await queryRunner.query(`DROP TYPE "public"."lms_exams_exam_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."lms_exams_exam_kind_enum"`);
  }
}
