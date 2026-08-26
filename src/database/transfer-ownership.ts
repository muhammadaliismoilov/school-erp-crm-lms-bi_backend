import 'dotenv/config';
import { DataSource } from 'typeorm';
import { migrationConnection } from './migration-connection';

/**
 * Sxema EGALIGINI ilova roliga o'tkazish (bir martalik xizmat amali).
 *
 * MUAMMO: production sxemasi `postgres` roli bilan yaratilgan (166 jadval),
 * Render'dagi ilova esa `app_backend` bilan ulanadi. PostgreSQL'da `ALTER TABLE`
 * ni FAQAT jadval egasi bajara oladi, shuning uchun har bir yangi migratsiya
 * `must be owner of table roles` bilan yiqiladi va qo'lda qo'llanishga majbur
 * qiladi (2026-08-25 hodisasining ikkinchi yarmi — birinchisi baseline bilan
 * hal qilingan, `baseline-migrations.ts`ga qarang).
 *
 * YECHIM (variant "b"): mavjud obyektlarning egasini `app_backend` qilamiz.
 * Shundan keyin migratsiyalar ilovaning o'z ulanishi bilan ishlaydi va
 * `MIGRATION_DATABASE_URL` (alohida, yuqori huquqli parol) umuman kerak emas.
 *
 * Muqobil variant "a" — migratsiya paytigina `postgres` bilan ulanish — Render
 * Free tarifida Pre-Deploy bosqichi yo'qligi sababli amalda kam foyda beradi:
 * u parol baribir ilovaning o'z muhitida (`process.env`) turadi.
 *
 * NIMA O'ZGARADI VA NIMA O'ZGARMAYDI:
 *  - O'zgaradi: jadval/ketma-ketlik/enum tiplarining EGASI.
 *  - O'zgarmaydi: ma'lumot, sxema tuzilishi, mavjud GRANT'lar, ilova xulqi.
 *  - RLS: loyihada umuman ishlatilmaydi (0 siyosat) — egalik almashuvi
 *    xavfsizlik chegarasiga ta'sir qilmaydi.
 *  - Extension obyektlariga (`pg_stat_statements`, `uuid-ossp`) TEGILMAYDI —
 *    ularning egaligini o'zgartirish extension'ni buzadi.
 *
 * ORQAGA QAYTARISH: xuddi shu skript teskari yo'nalishda —
 *   `--to=postgres --apply`
 *
 * Ishga tushirish:
 *   node dist/src/database/transfer-ownership.js                    # dry-run
 *   node dist/src/database/transfer-ownership.js --apply            # bajaradi
 *   node dist/src/database/transfer-ownership.js --print-sql        # SQL chiqaradi
 *   … --to=<rol>   # maqsad rol (standart: DATABASE_USER)
 *   … --all        # `--print-sql` uchun: hozirgi egasidan qat'i nazar hamma obyekt
 *
 * `--print-sql` bazaga ulanib obyektlar ro'yxatini oladi va oddiy SQL
 * (`ALTER … OWNER TO` ro'yxati) chiqaradi. Render Free'da shell yo'qligi
 * sababli uni bevosita Supabase SQL Editor'da bajarish mumkin — mantiq shu
 * fayldan chiqqani uchun ikkinchi "haqiqat manbasi" paydo bo'lmaydi.
 */

/** Egalikni o'zgartirish uchun obyekt turiga mos ALTER buyrug'i. */
const ALTER_BUYRUQ: Record<string, string> = {
  r: 'ALTER TABLE',
  p: 'ALTER TABLE',
  S: 'ALTER SEQUENCE',
  v: 'ALTER VIEW',
  m: 'ALTER MATERIALIZED VIEW',
};

/**
 * Jadvalga BOG'LANGAN ketma-ketliklarni ajratuvchi shart.
 *
 * `SERIAL` va `GENERATED AS IDENTITY` ustunlarining ketma-ketligi jadvalga
 * `pg_depend` orqali bog'langan (`a` — auto, `i` — internal). PostgreSQL
 * ularning egasini MUSTAQIL o'zgartirishga ruxsat bermaydi
 * (`cannot change owner of sequence …, sequence is linked to table …`) —
 * ular jadval bilan birga avtomatik ko'chadi. Shuning uchun ro'yxatdan
 * chiqaramiz, aks holda butun tranzaksiya yiqiladi.
 */
const BOGLANGAN_KETMA_KETLIK = `
    NOT (c.relkind = 'S' AND EXISTS (
      SELECT 1 FROM pg_depend dep
      WHERE dep.classid = 'pg_class'::regclass AND dep.objid = c.oid
        AND dep.refclassid = 'pg_class'::regclass AND dep.deptype IN ('a', 'i')
    ))`;

/**
 * Egasi almashtiriladigan relation'lar (jadval, ketma-ketlik, view).
 *
 * `d.objid IS NULL` — extension'ga tegishli obyektlarni chetlab o'tadi.
 * `pg_get_userbyid(...) <> $1` — allaqachon to'g'ri egadagilarini o'tkazib
 * yuboradi, ya'ni skript idempotent.
 */
const RELATION_SQL = `
  SELECT c.relname AS nom, c.relkind AS tur, pg_get_userbyid(c.relowner) AS ega
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_depend d
    ON d.objid = c.oid AND d.deptype = 'e' AND d.classid = 'pg_class'::regclass
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
    AND d.objid IS NULL
    AND ${BOGLANGAN_KETMA_KETLIK}
    AND ($2::boolean OR pg_get_userbyid(c.relowner) <> $1)
  ORDER BY c.relkind, c.relname`;

/**
 * Egasi almashtiriladigan tiplar: enum ('e') va domain ('d').
 *
 * Jadvallarning kompozit tiplari ('c') ataylab chetda: ularni alohida
 * o'zgartirib bo'lmaydi ("is a table's row type") va jadval bilan birga
 * o'tadi. Massiv tiplari ham element tipiga ergashadi.
 */
const TIP_SQL = `
  SELECT t.typname AS nom, pg_get_userbyid(t.typowner) AS ega
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  LEFT JOIN pg_depend d
    ON d.objid = t.oid AND d.deptype = 'e' AND d.classid = 'pg_type'::regclass
  WHERE n.nspname = 'public'
    AND t.typtype IN ('e', 'd')
    AND d.objid IS NULL
    AND ($2::boolean OR pg_get_userbyid(t.typowner) <> $1)
  ORDER BY t.typname`;

/** SQL identifikatorini ekranlash (`"` ichida). */
const ident = (nom: string): string => `"${nom.replace(/"/g, '""')}"`;

/**
 * Bevosita baza konsolida (Supabase SQL Editor) bajariladigan SQL'ni chiqaradi.
 *
 * NEGA PL/pgSQL EMAS: dastlab bu bir dona dinamik `DO $$ … $$` bloki edi —
 * Supabase SQL Editor uni to'g'ri uzatmadi (`syntax error at or near "DECLARE"`),
 * chunki so'rovni dollar-quote ichidan bo'lib yuboradi. Shuning uchun bu yerda
 * faqat ODDIY SQL: dollar-quoting ham, PL/pgSQL ham yo'q — har qanday klient
 * (SQL Editor, psql, GUI) bir xil bajaradi.
 *
 * Obyektlar ro'yxati skript ulangan bazadan olinadi. Lokal va production
 * sxemalari bir xilligi 2026-08-25 da o'lchov bilan tasdiqlangan (167 jadval,
 * 2310 ustun, 724 indeks) — shuning uchun lokaldan olingan ro'yxat production
 * uchun ham to'g'ri. Oxiridagi tekshiruv SELECT'i har qanday farqni ko'rsatadi.
 *
 * Xavfsizlik: hammasi bitta tranzaksiyada (yo hammasi, yo hech biri);
 * `ALTER … OWNER TO` allaqachon to'g'ri egada bo'lsa no-op — takroran
 * bajarish xavfsiz.
 */
function sqlChiqar(
  maqsad: string,
  relationlar: Relation[],
  tiplar: Tip[],
  joriyFoydalanuvchi: string,
): string {
  const m = ident(maqsad);

  /*
   * Egalikni o'tkazish uchun bajaruvchi maqsad rolning A'ZOSI bo'lishi shart.
   * Lekin rolni O'ZIGA berish xato beradi (`role "postgres" is a member of
   * role "postgres"`) va butun tranzaksiyani bekor qiladi — bu aynan orqaga
   * qaytarish yo'lida yuz beradi (maqsad `postgres`, SQL konsoli ham
   * `postgres` bilan ishlaydi). Shuning uchun bajaruvchi maqsad rolning
   * o'zi bo'lganda GRANT satri umuman chiqarilmaydi.
   */
  const grantSatri =
    maqsad === joriyFoydalanuvchi
      ? `-- (GRANT kerak emas: SQL'ni bajaruvchi rolning o'zi ${maqsad}.)`
      : `-- PostgreSQL obyekt egaligini faqat maqsad rolning A'ZOSIGA o'tkazishga
-- ruxsat beradi. Allaqachon a'zo bo'lsak — bu satr zararsiz takror.
GRANT ${m} TO CURRENT_USER;`;

  const alterlar = [
    ...relationlar.map((r) => {
      const buyruq = ALTER_BUYRUQ[r.tur] ?? 'ALTER TABLE';
      // `IF EXISTS` — ALTER TABLE/SEQUENCE/VIEW qo'llab-quvvatlaydi: agar
      // production'da bu obyekt bo'lmasa, butun blok yiqilmasin.
      return `${buyruq} IF EXISTS public.${ident(r.nom)} OWNER TO ${m};`;
    }),
    // ALTER TYPE'da IF EXISTS yo'q — tip nomlari sxema bilan birga keladi.
    ...tiplar.map((t) => `ALTER TYPE public.${ident(t.nom)} OWNER TO ${m};`),
  ].join('\n');

  return `-- Sxema egaligini ${maqsad} roliga o'tkazish (${relationlar.length} relation, ${tiplar.length} tip).
-- Manba: src/database/transfer-ownership.ts --print-sql
-- Ma'lumot va sxema tuzilishi O'ZGARMAYDI — faqat obyektlarning egasi.
-- Takroran bajarish xavfsiz. Hammasi bitta tranzaksiyada.
BEGIN;

-- Qorovul: bu kutilgan bazami? Jadval bo'lmasa shu yerda to'xtaydi va
-- butun tranzaksiya bekor bo'ladi — hech narsa o'zgarmaydi.
SELECT count(*) AS qorovul_roles_jadvali FROM public.roles;

${grantSatri}

${alterlar}

-- Yangi migratsiyalar yangi jadval/tip yarata olishi uchun.
GRANT USAGE, CREATE ON SCHEMA public TO ${m};

-- Natija: egalik taqsimoti (kutilgan holat — barchasi ${maqsad} rolida).
SELECT pg_get_userbyid(c.relowner) AS ega,
       count(*) FILTER (WHERE c.relkind IN ('r', 'p')) AS jadval,
       count(*) FILTER (WHERE c.relkind = 'S') AS ketma_ketlik,
       count(*) FILTER (WHERE c.relkind IN ('v', 'm')) AS view
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
GROUP BY 1 ORDER BY 1;

COMMIT;`;
}

interface Relation {
  nom: string;
  tur: string;
  ega: string;
}

interface Tip {
  nom: string;
  ega: string;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const printSql = process.argv.includes('--print-sql');
  // `--all`: hozirgi egasidan qat'i nazar HAMMA obyektni ro'yxatga oladi.
  // Kerak bo'ladigan joyi — orqaga qaytarish SQL'ini boshqa bazadan (odatda
  // lokaldan) generatsiya qilish: u yerda obyektlar allaqachon maqsad rolda
  // bo'lgani uchun oddiy ro'yxat bo'sh chiqardi. `ALTER … OWNER TO` to'g'ri
  // egada no-op bo'lgani uchun ortiqcha satrlar zarar qilmaydi.
  const hammasi = process.argv.includes('--all');
  const toArg = process.argv.find((a) => a.startsWith('--to='))?.slice('--to='.length);
  const maqsad = (toArg ?? process.env.DATABASE_USER ?? '').trim();

  if (!maqsad) {
    throw new Error(
      "Maqsad rol aniqlanmadi. `--to=<rol>` bering yoki DATABASE_USER o'rnating.",
    );
  }

  const { options, tavsif, alohidaUlanish } = migrationConnection();
  const dataSource = new DataSource(options);

  await dataSource.initialize();
  try {
    if (printSql) {
      // Ro'yxat shu ulanishdagi bazadan olinadi (odatda lokal) — sabab
      // `sqlChiqar()` izohida.
      console.log(
        sqlChiqar(
          maqsad,
          (await dataSource.query(RELATION_SQL, [maqsad, hammasi])) as Relation[],
          (await dataSource.query(TIP_SQL, [maqsad, hammasi])) as Tip[],
          (
            (await dataSource.query('select current_user as u')) as { u: string }[]
          )[0].u,
        ),
      );
      return;
    }

    console.log(apply ? '=== EGALIKNI O\'TKAZISH (--apply) ===' : '=== EGALIKNI O\'TKAZISH (dry-run) ===');
    console.log(
      `Ulanish: ${tavsif}` +
        (alohidaUlanish ? ' (alohida MIGRATION_DATABASE_URL)' : ' (ilova ulanishi)'),
    );
    console.log(`Maqsad rol: ${maqsad}\n`);

    // 1) Qorovullar
    const [{ ok: bazaOk }] = (await dataSource.query(
      `select to_regclass('public.roles') is not null as ok`,
    )) as { ok: boolean }[];
    if (!bazaOk) {
      throw new Error('Qorovul: "roles" jadvali yo\'q — bu kutilgan baza emas');
    }

    const [{ ok: rolOk }] = (await dataSource.query(
      `select exists(select 1 from pg_roles where rolname = $1) as ok`,
      [maqsad],
    )) as { ok: boolean }[];
    if (!rolOk) {
      throw new Error(`Qorovul: "${maqsad}" roli bazada yo'q`);
    }

    // 2) Nima o'zgaradi
    const relationlar = (await dataSource.query(RELATION_SQL, [maqsad, false])) as Relation[];
    const tiplar = (await dataSource.query(TIP_SQL, [maqsad, false])) as Tip[];

    const turBoyicha = new Map<string, number>();
    for (const r of relationlar) turBoyicha.set(r.tur, (turBoyicha.get(r.tur) ?? 0) + 1);

    console.log('Egasi almashtiriladi:');
    for (const [tur, soni] of [...turBoyicha].sort()) {
      console.log(`   ${(ALTER_BUYRUQ[tur] ?? tur).padEnd(24)} ${soni}`);
    }
    console.log(`   ${'ALTER TYPE (enum/domain)'.padEnd(24)} ${tiplar.length}`);

    const hozirgiEgalar = new Set([...relationlar.map((r) => r.ega), ...tiplar.map((t) => t.ega)]);
    if (hozirgiEgalar.size > 0) {
      console.log(`\nHozirgi egalar: ${[...hozirgiEgalar].sort().join(', ')}`);
    }

    if (relationlar.length === 0 && tiplar.length === 0) {
      console.log('\n✓ O\'zgartiradigan narsa yo\'q — egalik allaqachon to\'g\'ri.');
      return;
    }

    if (!apply) {
      console.log('\nDRY-RUN — hech narsa o\'zgartirilmadi. Bajarish uchun: --apply');
      return;
    }

    // 3) Bajarish — bitta tranzaksiyada (yo hammasi, yo hech biri)
    await dataSource.transaction(async (manager) => {
      const [{ ok: azoOk }] = (await manager.query(
        `select pg_has_role(current_user, $1, 'USAGE') as ok`,
        [maqsad],
      )) as { ok: boolean }[];
      if (!azoOk) {
        // PostgreSQL egalikni faqat maqsad rolning a'zosiga o'tkazishga ruxsat beradi.
        await manager.query(`GRANT ${ident(maqsad)} TO CURRENT_USER`);
      }

      for (const r of relationlar) {
        const buyruq = ALTER_BUYRUQ[r.tur] ?? 'ALTER TABLE';
        await manager.query(`${buyruq} public.${ident(r.nom)} OWNER TO ${ident(maqsad)}`);
      }
      for (const t of tiplar) {
        await manager.query(`ALTER TYPE public.${ident(t.nom)} OWNER TO ${ident(maqsad)}`);
      }

      // Yangi migratsiyalar yangi jadval/tip yarata olishi uchun.
      await manager.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${ident(maqsad)}`);
    });

    console.log(
      `\n✓ ${relationlar.length} relation va ${tiplar.length} tip endi "${maqsad}" egaligida.`,
    );
    console.log('  Ma\'lumot va sxema tuzilishi o\'zgarmadi.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('\nEgalikni o\'tkazish bajarilmadi:', error instanceof Error ? error.message : error);
  process.exit(1);
});
