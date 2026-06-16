import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781569187472 implements MigrationInterface {
    name = 'AutoMigration1781569187472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "student_admissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "student_id" uuid NOT NULL, "lead_id" uuid, "middle_name" character varying(80), "nationality" character varying(60), "birth_certificate_series" character varying(20), "birth_certificate_number" character varying(40), "passport" character varying(40), "jshshir" character varying(32), "passport_issued_date" date, "guardian_full_name" character varying(160) NOT NULL, "guardian_relation" character varying(40), "guardian_passport" character varying(40), "guardian_jshshir" character varying(32), "guardian_phone" character varying(32) NOT NULL, "region" character varying(80), "district" character varying(80), "address" text, "personal_phone" character varying(32), CONSTRAINT "REL_223f964a2fff3f7a45610f43de" UNIQUE ("student_id"), CONSTRAINT "PK_28566988c92be41022acf22bdf3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_student_admissions_student" ON "student_admissions" ("student_id") `);
        await queryRunner.query(`CREATE TABLE "lead_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "lead_id" uuid NOT NULL, "author_id" uuid, "body" text NOT NULL, "remind_at" TIMESTAMP WITH TIME ZONE, "reminder_done_at" TIMESTAMP WITH TIME ZONE, "is_pinned" boolean NOT NULL DEFAULT false, "context" jsonb, CONSTRAINT "PK_0b6403ed412acdd7f84f74f992c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_lead_comments_remind_at" ON "lead_comments" ("remind_at") `);
        await queryRunner.query(`CREATE INDEX "idx_lead_comments_lead" ON "lead_comments" ("lead_id") `);
        await queryRunner.query(`CREATE TABLE "lead_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "name" character varying(60) NOT NULL, "color" character varying(9), CONSTRAINT "PK_ce6b12309bf373c5af878035b3e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_lead_tags_name" ON "lead_tags" ("name") `);
        await queryRunner.query(`CREATE TABLE "lead_tag_links" ("lead_id" uuid NOT NULL, "tag_id" uuid NOT NULL, CONSTRAINT "PK_f13c2bb57a68ec71b4a73209ba3" PRIMARY KEY ("lead_id", "tag_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e1e0344bd1143c407bc115bf56" ON "lead_tag_links" ("lead_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d721f87822b629d42677674097" ON "lead_tag_links" ("tag_id") `);
        await queryRunner.query(`ALTER TABLE "leads" ADD "enrolled_student_id" uuid`);
        await queryRunner.query(`ALTER TABLE "student_admissions" ADD CONSTRAINT "FK_223f964a2fff3f7a45610f43ded" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lead_comments" ADD CONSTRAINT "FK_3659ec3418128431c0f29c4c89c" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lead_comments" ADD CONSTRAINT "FK_1e6f37af4a460c0e3614f525ada" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lead_tag_links" ADD CONSTRAINT "FK_e1e0344bd1143c407bc115bf560" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lead_tag_links" ADD CONSTRAINT "FK_d721f87822b629d426776740970" FOREIGN KEY ("tag_id") REFERENCES "lead_tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lead_tag_links" DROP CONSTRAINT "FK_d721f87822b629d426776740970"`);
        await queryRunner.query(`ALTER TABLE "lead_tag_links" DROP CONSTRAINT "FK_e1e0344bd1143c407bc115bf560"`);
        await queryRunner.query(`ALTER TABLE "lead_comments" DROP CONSTRAINT "FK_1e6f37af4a460c0e3614f525ada"`);
        await queryRunner.query(`ALTER TABLE "lead_comments" DROP CONSTRAINT "FK_3659ec3418128431c0f29c4c89c"`);
        await queryRunner.query(`ALTER TABLE "student_admissions" DROP CONSTRAINT "FK_223f964a2fff3f7a45610f43ded"`);
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "enrolled_student_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d721f87822b629d42677674097"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e1e0344bd1143c407bc115bf56"`);
        await queryRunner.query(`DROP TABLE "lead_tag_links"`);
        await queryRunner.query(`DROP INDEX "public"."uq_lead_tags_name"`);
        await queryRunner.query(`DROP TABLE "lead_tags"`);
        await queryRunner.query(`DROP INDEX "public"."idx_lead_comments_lead"`);
        await queryRunner.query(`DROP INDEX "public"."idx_lead_comments_remind_at"`);
        await queryRunner.query(`DROP TABLE "lead_comments"`);
        await queryRunner.query(`DROP INDEX "public"."uq_student_admissions_student"`);
        await queryRunner.query(`DROP TABLE "student_admissions"`);
    }

}
