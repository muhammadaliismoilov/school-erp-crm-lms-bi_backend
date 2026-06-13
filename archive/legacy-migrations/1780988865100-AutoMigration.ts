import type { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1780988865100 implements MigrationInterface {
    name = 'AutoMigration1780988865100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create appeals types
        await queryRunner.query(`CREATE TYPE "public"."appeals_type_enum" AS ENUM('suggestion', 'complaint')`);
        await queryRunner.query(`CREATE TYPE "public"."appeals_target_role_enum" AS ENUM('class_teacher', 'deputy_director', 'director', 'accountant', 'sales_manager', 'psychologist', 'doctor', 'librarian')`);
        await queryRunner.query(`CREATE TYPE "public"."appeals_source_enum" AS ENUM('manual', 'public_link', 'system')`);
        await queryRunner.query(`CREATE TYPE "public"."appeals_status_enum" AS ENUM('pending', 'in_progress', 'resolved', 'rejected')`);

        // Create appeals table
        await queryRunner.query(`CREATE TABLE "appeals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "full_name" character varying(150) NOT NULL, "phone" character varying(20) NOT NULL, "type" "public"."appeals_type_enum" NOT NULL, "target_role" "public"."appeals_target_role_enum" NOT NULL, "description" text NOT NULL, "source" "public"."appeals_source_enum" NOT NULL DEFAULT 'public_link', "status" "public"."appeals_status_enum" NOT NULL DEFAULT 'pending', CONSTRAINT "PK_ebd2050a02aa78081b5346152bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_appeals_phone" ON "appeals" ("phone") `);
        await queryRunner.query(`CREATE INDEX "idx_appeals_target_role" ON "appeals" ("target_role") `);
        await queryRunner.query(`CREATE INDEX "idx_appeals_type" ON "appeals" ("type") `);
        await queryRunner.query(`CREATE INDEX "idx_appeals_status" ON "appeals" ("status") `);

        // Create integrations table
        await queryRunner.query(`CREATE TABLE "integrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "name" character varying(100) NOT NULL, "code" character varying(50) NOT NULL, "description" character varying(255), "category" character varying(80) NOT NULL, "is_enabled" boolean NOT NULL DEFAULT false, "config" jsonb DEFAULT '{}', CONSTRAINT "PK_9adcdc6d6f3922535361ce641e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_integrations_is_enabled" ON "integrations" ("is_enabled") `);
        await queryRunner.query(`CREATE INDEX "idx_integrations_category" ON "integrations" ("category") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_integrations_code" ON "integrations" ("code") WHERE "deleted_at" IS NULL`);

        // Schools default alter
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "group_monthly_payments" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Schools default alter revert
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "group_monthly_payments" SET DEFAULT '[]'`);

        // Drop integrations indices and table
        await queryRunner.query(`DROP INDEX "public"."uq_integrations_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_integrations_category"`);
        await queryRunner.query(`DROP INDEX "public"."idx_integrations_is_enabled"`);
        await queryRunner.query(`DROP TABLE "integrations"`);

        // Drop appeals indices, table and types
        await queryRunner.query(`DROP INDEX "public"."idx_appeals_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_appeals_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_appeals_target_role"`);
        await queryRunner.query(`DROP INDEX "public"."idx_appeals_phone"`);
        await queryRunner.query(`DROP TABLE "appeals"`);
        await queryRunner.query(`DROP TYPE "public"."appeals_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."appeals_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."appeals_target_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."appeals_type_enum"`);
    }
}
