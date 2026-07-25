import type { MigrationInterface, QueryRunner } from 'typeorm';

/** HR "Vakansiyalar" moduli: `hr_vacancies` jadvalini yaratadi. */
export class HrVacancies1784400000000 implements MigrationInterface {
  name = 'HrVacancies1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_vacancies_status_enum" AS ENUM ('open', 'closed', 'draft', 'pending');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_vacancies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "title" varchar(200) NOT NULL,
        "status" "hr_vacancies_status_enum" NOT NULL DEFAULT 'open',
        "department_id" uuid,
        "position_id" uuid,
        "recruiter_id" uuid,
        "min_salary" numeric(14,2),
        "max_salary" numeric(14,2),
        "responsibilities" text,
        "requirements" text,
        CONSTRAINT "pk_hr_vacancies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_vacancies" ADD CONSTRAINT "fk_hr_vacancies_department"
          FOREIGN KEY ("department_id") REFERENCES "hr_departments"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_vacancies" ADD CONSTRAINT "fk_hr_vacancies_position"
          FOREIGN KEY ("position_id") REFERENCES "hr_positions"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "hr_vacancies" ADD CONSTRAINT "fk_hr_vacancies_recruiter"
          FOREIGN KEY ("recruiter_id") REFERENCES "hr_staff_members"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_vacancies_status" ON "hr_vacancies" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_vacancies"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_vacancies_status_enum"`);
  }
}
