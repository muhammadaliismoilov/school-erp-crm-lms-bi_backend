import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppealAssignmentAndResolution1781500000000 implements MigrationInterface {
  name = 'AddAppealAssignmentAndResolution1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appeals" ADD COLUMN "assignee_user_id" uuid`);
    await queryRunner.query(`ALTER TABLE "appeals" ADD COLUMN "resolution_note" text`);
    await queryRunner.query(`ALTER TABLE "appeals" ADD COLUMN "resolved_by_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "appeals" ADD COLUMN "resolved_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_appeals_assignee" ON "appeals" ("assignee_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_appeals_assignee"`);
    await queryRunner.query(`ALTER TABLE "appeals" DROP COLUMN "resolved_at"`);
    await queryRunner.query(`ALTER TABLE "appeals" DROP COLUMN "resolved_by_id"`);
    await queryRunner.query(`ALTER TABLE "appeals" DROP COLUMN "resolution_note"`);
    await queryRunner.query(`ALTER TABLE "appeals" DROP COLUMN "assignee_user_id"`);
  }
}
