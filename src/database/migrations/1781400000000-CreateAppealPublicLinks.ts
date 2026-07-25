import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppealPublicLinks1781400000000 implements MigrationInterface {
  name = 'CreateAppealPublicLinks1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "appeal_public_links" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMP WITH TIME ZONE, ` +
        `"version" integer NOT NULL, ` +
        `"token" character varying(64) NOT NULL, ` +
        `"is_active" boolean NOT NULL DEFAULT true, ` +
        `"created_by_id" uuid, ` +
        `CONSTRAINT "PK_appeal_public_links" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_appeal_public_links_token" ON "appeal_public_links" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_appeal_public_links_active" ON "appeal_public_links" ("is_active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_appeal_public_links_active"`);
    await queryRunner.query(`DROP INDEX "public"."uq_appeal_public_links_token"`);
    await queryRunner.query(`DROP TABLE "appeal_public_links"`);
  }
}
