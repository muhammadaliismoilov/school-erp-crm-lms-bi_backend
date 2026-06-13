import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchoolCountry1781300000000 implements MigrationInterface {
  name = 'AddSchoolCountry1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "schools" ADD "country" character varying(2) NOT NULL DEFAULT 'UZ'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schools" DROP COLUMN "country"`);
  }
}
