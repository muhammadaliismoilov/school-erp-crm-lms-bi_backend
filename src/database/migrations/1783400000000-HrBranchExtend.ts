import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Filiallar" kengaytmasi: `branches` jadvaliga ota filial (parent),
 * bosh ofis (is_head_office) maydonlarini qo'shadi va `school_id` ni ixtiyoriy
 * qiladi (HR orqali yaratilgan filiallar maktabsiz bo'lishi mumkin).
 */
export class HrBranchExtend1783400000000 implements MigrationInterface {
  name = 'HrBranchExtend1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "branches" ALTER COLUMN "school_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "branches"
        ADD COLUMN IF NOT EXISTS "parent_id" uuid,
        ADD COLUMN IF NOT EXISTS "is_head_office" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "branches"
          ADD CONSTRAINT "fk_branches_parent" FOREIGN KEY ("parent_id")
          REFERENCES "branches"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_branches_parent" ON "branches" ("parent_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "branches" DROP CONSTRAINT IF EXISTS "fk_branches_parent"`);
    await queryRunner.query(`
      ALTER TABLE "branches"
        DROP COLUMN IF EXISTS "parent_id",
        DROP COLUMN IF EXISTS "is_head_office"
    `);
    // school_id ni qayta NOT NULL qilmaymiz (ma'lumot yo'qolishi mumkin).
  }
}
