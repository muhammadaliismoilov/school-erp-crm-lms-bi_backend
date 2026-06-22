import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ota-ona modelini birlashtirish: endi ota-ona = PARENT rolidagi `users` yozuvi
 * (alohida `parents` jadvali olib tashlandi).
 *
 *  - `student_parents.parent_id` FK `parents` → `users` ga ko‘chiriladi.
 *  - PARENT vasiy faqat ism+telefon bilan kelishi mumkin, shuning uchun
 *    `users` dagi kirillcha ism/familiya va jins ustunlari NULL bo‘lishiga ruxsat.
 *  - `parents` jadvali butunlay drop qilinadi (demo ma‘lumot).
 */
export class StudentsParentUnify1782300000000 implements MigrationInterface {
  name = 'StudentsParentUnify1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- users: PARENT uchun kirillcha ism/familiya va jins ixtiyoriy ---
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "first_name_cyrillic" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "last_name_cyrillic" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "gender" DROP NOT NULL`,
    );

    // --- student_parents: mavjud barcha FK larni olib tashlash ---
    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT conname FROM pg_constraint
          WHERE conrelid = 'student_parents'::regclass AND contype = 'f'
        LOOP
          EXECUTE 'ALTER TABLE "student_parents" DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);

    // Eski parent_id qiymatlari `parents` ga ishora qilgani uchun bog‘lanishlar tozalanadi.
    await queryRunner.query(`TRUNCATE TABLE "student_parents"`);

    // --- FK larni qayta tiklash: student → students, parent → users ---
    await queryRunner.query(`
      ALTER TABLE "student_parents"
      ADD CONSTRAINT "FK_student_parents_student"
      FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "student_parents"
      ADD CONSTRAINT "FK_student_parents_parent_user"
      FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // --- eski parents jadvali drop ---
    await queryRunner.query(`DROP TABLE IF EXISTS "parents"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // parents jadvalini qayta yaratish
    await queryRunner.query(`
      CREATE TABLE "parents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "first_name" character varying(80) NOT NULL,
        "last_name" character varying(80),
        "phone" character varying(32) NOT NULL,
        "email" character varying(254),
        CONSTRAINT "PK_parents" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_parents_phone" ON "parents" ("phone")`,
    );

    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT conname FROM pg_constraint
          WHERE conrelid = 'student_parents'::regclass AND contype = 'f'
        LOOP
          EXECUTE 'ALTER TABLE "student_parents" DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);
    await queryRunner.query(`TRUNCATE TABLE "student_parents"`);
    await queryRunner.query(`
      ALTER TABLE "student_parents"
      ADD CONSTRAINT "FK_student_parents_student"
      FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "student_parents"
      ADD CONSTRAINT "FK_student_parents_parent"
      FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE
    `);

    // users ustunlarini qayta NOT NULL qilish (NULL larni default bilan to‘ldirish)
    await queryRunner.query(
      `UPDATE "users" SET "first_name_cyrillic" = "first_name" WHERE "first_name_cyrillic" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "last_name_cyrillic" = "last_name" WHERE "last_name_cyrillic" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "gender" = 'male' WHERE "gender" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "first_name_cyrillic" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "last_name_cyrillic" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "gender" SET NOT NULL`,
    );
  }
}
