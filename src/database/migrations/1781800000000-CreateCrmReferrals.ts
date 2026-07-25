import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmReferrals1781800000000 implements MigrationInterface {
  name = 'CreateCrmReferrals1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."crm_referrals_template_enum" AS ENUM('classic', 'centered', 'split', 'fullscreen')`,
    );
    await queryRunner.query(
      `CREATE TABLE "crm_referrals" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMP WITH TIME ZONE, ` +
        `"version" integer NOT NULL, ` +
        `"name" character varying(120) NOT NULL, ` +
        `"code" character varying(32) NOT NULL, ` +
        `"description" text, ` +
        `"source_id" uuid, ` +
        `"expires_at" TIMESTAMP WITH TIME ZONE, ` +
        `"template" "public"."crm_referrals_template_enum" NOT NULL DEFAULT 'classic', ` +
        `"theme_color" character varying(9), ` +
        `"is_active" boolean NOT NULL DEFAULT true, ` +
        `"created_by_id" uuid, ` +
        `CONSTRAINT "PK_crm_referrals" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_crm_referrals_code" ON "crm_referrals" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_crm_referrals_active" ON "crm_referrals" ("is_active")`,
    );
    await queryRunner.query(
      `ALTER TABLE "crm_referrals" ADD CONSTRAINT "FK_crm_referrals_source" ` +
        `FOREIGN KEY ("source_id") REFERENCES "lead_sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "crm_referrals" ADD CONSTRAINT "FK_crm_referrals_created_by" ` +
        `FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "crm_referrals" DROP CONSTRAINT "FK_crm_referrals_created_by"`);
    await queryRunner.query(`ALTER TABLE "crm_referrals" DROP CONSTRAINT "FK_crm_referrals_source"`);
    await queryRunner.query(`DROP INDEX "public"."idx_crm_referrals_active"`);
    await queryRunner.query(`DROP INDEX "public"."uq_crm_referrals_code"`);
    await queryRunner.query(`DROP TABLE "crm_referrals"`);
    await queryRunner.query(`DROP TYPE "public"."crm_referrals_template_enum"`);
  }
}
