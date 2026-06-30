import { MigrationInterface, QueryRunner } from 'typeorm';

/** HR "Loyihalar" — `hr_projects` ga `color` (UI rangi) ustunini qo'shadi. */
export class HrProjectColor1785100000000 implements MigrationInterface {
  name = 'HrProjectColor1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_projects" ADD COLUMN IF NOT EXISTS "color" varchar(9)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "hr_projects" DROP COLUMN IF EXISTS "color"`);
  }
}
