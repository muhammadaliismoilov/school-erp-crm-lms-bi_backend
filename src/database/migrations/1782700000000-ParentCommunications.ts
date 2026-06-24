import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `parent_communications` jadvalini yaratadi — "Ota-onalar bilan muloqot"
 * moduli uchun. Xodim ota-ona bilan muloqotni qayd qiladi: sentiment, ballar,
 * maqsad/izoh.
 */
export class ParentCommunications1782700000000 implements MigrationInterface {
  name = 'ParentCommunications1782700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "parent_communications_parent_type_enum" AS ENUM ('mother', 'father', 'guardian', 'other');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "parent_communications_sentiment_enum" AS ENUM ('positive', 'neutral', 'negative');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parent_communications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "student_id" uuid NOT NULL,
        "class_id" uuid,
        "parent_id" uuid,
        "parent_type" "parent_communications_parent_type_enum" NOT NULL,
        "sentiment" "parent_communications_sentiment_enum" NOT NULL,
        "tutor_id" uuid,
        "created_by_id" uuid,
        "education_score" smallint,
        "class_leader_score" smallint,
        "extracurricular_score" smallint,
        "organizational_score" smallint,
        "purpose" text,
        "notes" text,
        "communication_date" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_parent_communications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_pc_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_pc_class" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_pc_parent" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_pc_tutor" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_pc_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_parent_comm_sentiment" ON "parent_communications" ("sentiment")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_parent_comm_class" ON "parent_communications" ("class_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_parent_comm_student" ON "parent_communications" ("student_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_parent_comm_date" ON "parent_communications" ("communication_date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_parent_comm_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_parent_comm_student"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_parent_comm_class"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_parent_comm_sentiment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parent_communications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "parent_communications_sentiment_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "parent_communications_parent_type_enum"`);
  }
}
