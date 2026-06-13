import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRooms1780800003000 implements MigrationInterface {
  name = 'CreateRooms1780800003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "room_number" varchar(32) NOT NULL,
        "room_number_normalized" varchar(32) NOT NULL,
        "floor" smallint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "pk_rooms_id" PRIMARY KEY ("id"),
        CONSTRAINT "chk_rooms_floor_range" CHECK ("floor" BETWEEN 1 AND 100),
        CONSTRAINT "chk_rooms_number_not_blank" CHECK (btrim("room_number") <> ''),
        CONSTRAINT "chk_rooms_normalized_number_not_blank" CHECK (btrim("room_number_normalized") <> '')
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_rooms_normalized_number_active"
      ON "rooms" ("room_number_normalized")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rooms_floor_active"
      ON "rooms" ("floor")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_rooms_floor_active"');
    await queryRunner.query('DROP INDEX IF EXISTS "uq_rooms_normalized_number_active"');
    await queryRunner.query('DROP TABLE IF EXISTS "rooms"');
  }
}
