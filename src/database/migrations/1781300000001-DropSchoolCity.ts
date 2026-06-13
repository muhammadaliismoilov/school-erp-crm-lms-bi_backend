import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSchoolCity1781300000001 implements MigrationInterface {
  name = 'DropSchoolCity1781300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schools" DROP COLUMN IF EXISTS "city"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "schools" ADD "city" character varying(120)`,
    );
  }
}
