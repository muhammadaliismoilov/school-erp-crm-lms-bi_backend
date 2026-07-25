import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Vazifalar" moduli: `hr_projects` (minimal loyihalar) va `hr_tasks`
 * (vazifalar) jadvallarini yaratadi.
 */
export class HrTasks1783700000000 implements MigrationInterface {
  name = 'HrTasks1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_projects_status_enum" AS ENUM ('active', 'inactive');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_tasks_status_enum" AS ENUM
         ('pending', 'in_progress', 'review', 'done', 'cancelled');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "hr_tasks_priority_enum" AS ENUM
         ('low', 'medium', 'high', 'urgent');
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "name" varchar(160) NOT NULL,
        "description" text,
        "status" "hr_projects_status_enum" NOT NULL DEFAULT 'active',
        CONSTRAINT "pk_hr_projects" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_hr_projects_name_active" ON "hr_projects" ("name") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hr_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "version" integer NOT NULL DEFAULT 1,
        "title" varchar(200) NOT NULL,
        "description" text,
        "project_id" uuid,
        "assignee_id" uuid,
        "status" "hr_tasks_status_enum" NOT NULL DEFAULT 'pending',
        "priority" "hr_tasks_priority_enum" NOT NULL DEFAULT 'medium',
        "start_date" date,
        "end_date" date,
        CONSTRAINT "pk_hr_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "fk_hr_tasks_project" FOREIGN KEY ("project_id")
          REFERENCES "hr_projects"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_hr_tasks_assignee" FOREIGN KEY ("assignee_id")
          REFERENCES "hr_staff_members"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_tasks_status" ON "hr_tasks" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_tasks_priority" ON "hr_tasks" ("priority")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_tasks_project" ON "hr_tasks" ("project_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_hr_tasks_assignee" ON "hr_tasks" ("assignee_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_tasks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hr_projects"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_tasks_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hr_projects_status_enum"`);
  }
}
