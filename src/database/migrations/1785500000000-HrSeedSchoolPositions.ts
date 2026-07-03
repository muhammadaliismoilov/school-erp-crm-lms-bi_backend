import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * HR "Lavozimlar" seed — asosiy maktab (Yuton School) uchun 6 bo'limga tavsiya
 * etilgan lavozimlarni to'ldiradi (A-variant: oshpaz va haydovchi Ma'muriy
 * bo'limga kiradi, alohida Oshxona/Logistika bo'limlari ochilmaydi).
 *
 * Idempotent: har bir lavozim `code` bo'yicha mavjud bo'lmasagina qo'shiladi,
 * shu sabab qayta ishga tushirilsa dublikat yaratmaydi. Mavjud lavozimlar
 * (O'qituvchi, Zavuch, Operator, Service manager, Sotuv manageri, Sotuv bo'lim
 * boshlig'i) ro'yxatga kiritilmagan.
 */
export class HrSeedSchoolPositions1785500000000 implements MigrationInterface {
  name = 'HrSeedSchoolPositions1785500000000';

  /** [department_code, position_code, position_title] */
  private readonly rows: Array<[string, string, string]> = [
    // Akademik bo'lim
    ['akademik_bo_lim', 'direktor_orinbosari_oquv', "Direktor o`rinbosari (o`quv ishlari)"],
    ['akademik_bo_lim', 'metodist', 'Metodist'],
    ['akademik_bo_lim', 'kurator', 'Kurator'],
    ['akademik_bo_lim', 'assistent_oqituvchi', "Assistent o`qituvchi"],
    ['akademik_bo_lim', 'psixolog', 'Psixolog'],
    ['akademik_bo_lim', 'logoped', 'Logoped'],
    ['akademik_bo_lim', 'mentor_oqituvchi', "Mentor o`qituvchi"],
    // Sotuv bo'limi
    ['sotuv_bo_limi', 'call_markaz_operatori', 'Call-markaz operatori'],
    ['sotuv_bo_limi', 'crm_menejeri', 'CRM menejeri'],
    ['sotuv_bo_limi', 'retention_menejeri', 'Retention menejeri'],
    // Qabul bo'limi
    ['qabul_bo_limi', 'qabul_bo_lim_boshligi', "Qabul bo`lim boshlig`i"],
    ['qabul_bo_limi', 'administrator', 'Administrator (Reception)'],
    ['qabul_bo_limi', 'registrator', 'Registrator'],
    ['qabul_bo_limi', 'konsultant', 'Konsultant'],
    ['qabul_bo_limi', 'test_nazoratchisi', 'Test nazoratchisi'],
    // Moliya
    ['moliya', 'bosh_buxgalter', 'Bosh buxgalter'],
    ['moliya', 'kassir', 'Kassir'],
    ['moliya', 'moliyachi', 'Moliyachi / iqtisodchi'],
    ['moliya', 'tolov_nazoratchisi', "To`lov nazoratchisi"],
    // Marketing bo'limi
    ['marketing_bo_limi', 'marketing_bo_lim_boshligi', "Marketing bo`lim boshlig`i"],
    ['marketing_bo_limi', 'smm_mutaxassisi', 'SMM mutaxassisi'],
    ['marketing_bo_limi', 'targetolog', 'Targetolog'],
    ['marketing_bo_limi', 'kontent_menejer', 'Kontent-menejer'],
    ['marketing_bo_limi', 'dizayner', 'Dizayner'],
    ['marketing_bo_limi', 'videograf', 'Videograf / montajchi'],
    // Ma'muriy bo'lim
    ['ma_muriy_bo_lim', 'hr_menejer', 'HR menejer'],
    ['ma_muriy_bo_lim', 'ofis_menejer', 'Ofis-menejer'],
    ['ma_muriy_bo_lim', 'taminot_masuli', "Ta`minot mas`uli"],
    ['ma_muriy_bo_lim', 'it_administrator', 'IT administrator'],
    ['ma_muriy_bo_lim', 'qorovul', 'Xavfsizlik xodimi (qorovul)'],
    ['ma_muriy_bo_lim', 'farrosh', 'Farrosh'],
    ['ma_muriy_bo_lim', 'bosh_oshpaz', 'Bosh oshpaz'],
    ['ma_muriy_bo_lim', 'yordamchi_oshpaz', 'Yordamchi oshpaz'],
    ['ma_muriy_bo_lim', 'haydovchi', 'Haydovchi'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Asosiy maktab (bosh ofis) — lavozimlar shu maktabga biriktiriladi.
    const schools: Array<{ id: string }> = await queryRunner.query(
      `SELECT id FROM "schools" WHERE (name->>'uz') = 'Yuton School' AND deleted_at IS NULL LIMIT 1`,
    );
    const schoolId = schools[0]?.id ?? null;

    for (const [deptCode, code, title] of this.rows) {
      await queryRunner.query(
        `
        INSERT INTO "hr_positions"
          ("title", "code", "base_salary", "status", "department_id", "school_id", "version")
        SELECT $1::varchar, $2::varchar, 0, 'active', d."id", $4::uuid, 1
        FROM "hr_departments" d
        WHERE d."code" = $3::varchar AND d."deleted_at" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "hr_positions" p
            WHERE p."code" = $2::varchar AND p."deleted_at" IS NULL
          )
        `,
        [title, code, deptCode, schoolId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = this.rows.map(([, code]) => code);
    await queryRunner.query(`DELETE FROM "hr_positions" WHERE "code" = ANY($1)`, [codes]);
  }
}
