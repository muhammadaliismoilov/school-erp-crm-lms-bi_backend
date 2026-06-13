import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLibrarianTargetRoleToAppeals1780988865200 implements MigrationInterface {
  name = 'AddLibrarianTargetRoleToAppeals1780988865200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DO $$\n" +
        "BEGIN\n" +
        "  IF NOT EXISTS (\n" +
        "    SELECT 1\n" +
        "    FROM pg_enum\n" +
        "    WHERE enumlabel = 'librarian'\n" +
        "      AND enumtypid = 'public.appeals_target_role_enum'::regtype\n" +
        "  ) THEN\n" +
        "    ALTER TYPE \"public\".\"appeals_target_role_enum\" ADD VALUE 'librarian';\n" +
        "  END IF;\n" +
        "END\n" +
        "$$;",
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL enum qiymatini xavfsiz olib tashlash uchun jadvalni qayta yaratish kerak.
  }
}
