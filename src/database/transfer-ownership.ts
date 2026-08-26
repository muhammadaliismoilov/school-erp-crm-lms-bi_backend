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
 *
 * `--print-sql` bazaga ULANMAYDI: qorovuli va idempotentligi ichiga o'rnatilgan
 * yagona SQL blokini chiqaradi. Render Free'da shell yo'qligi sababli uni
 * bevosita Supabase SQL Editor'da bajarish mumkin — mantiq shu fayldan
 * chiqqani uchun ikkinchi "haqiqat manbasi" paydo bo'lmaydi.
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
    AND pg_get_userbyid(c.relowner) <> $1
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
    AND pg_get_userbyid(t.typowner) <> $1
  ORDER BY t.typname`;

/** SQL identifikatorini ekranlash (`"` ichida). */
const ident = (nom: string): string => `"${nom.replace(/"/g, '""')}"`;

/** SQL matn literalini ekranlash. */
const literal = (qiymat: string): string => `'${qiymat.replace(/'/g, "''")}'`;

/**
 * Bazaga ulanmasdan, o'z-o'zini himoya qiladigan SQL blokini chiqaradi.
 *
 * Blok dinamik: obyektlar ro'yxati lokal inventardan emas, bajarilayotgan
 * bazaning o'zidan olinadi — shuning uchun production'dagi haqiqiy holatga
 * mos ishlaydi va takroran bajarish xavfsiz.
 */
function sqlChiqar(maqsad: string): string {
  const m = literal(maqsad);

  return `-- Sxema egaligini ${ident(maqsad)} roliga o'tkazish.
-- Manba: src/database/transfer-ownership.ts --print-sql
-- Ma'lumot va sxema tuzilishi O'ZGARMAYDI — faqat obyektlarning egasi.
-- Takroran bajarish xavfsiz (allaqachon to'g'ri egadagilar o'tkazib yuboriladi).
BEGIN;

DO $$
DECLARE
  maqsad text := ${m};
  r record;
  n_relation int := 0;
  n_tip int := 0;
BEGIN
  -- Qorovul 1: bu kutilgan bazami?
  IF to_regclass('public.roles') IS NULL THEN
    RAISE EXCEPTION 'Qorovul: "roles" jadvali yo''q — bu kutilgan baza emas';
  END IF;

  -- Qorovul 2: maqsad rol mavjudmi?
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = maqsad) THEN
    RAISE EXCEPTION 'Qorovul: "%" roli bazada yo''q', maqsad;
  END IF;

  -- Qorovul 3: PostgreSQL obyekt egaligini o'zgartirishga faqat maqsad
  -- rolning a'zosiga ruxsat beradi. A'zo bo'lmasak — a'zolikni olishga
  -- urinamiz (CREATEROLE yoki admin option kerak).
  IF NOT pg_has_role(current_user, maqsad, 'USAGE') THEN
    BEGIN
      EXECUTE format('GRANT %I TO CURRENT_USER', maqsad);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'Qorovul: "%" rolining a''zosi emassiz va a''zolik ololmadingiz. '
        'Superuser (yoki rol egasi) sifatida "GRANT % TO %;" bajaring.',
        maqsad, maqsad, current_user;
    END;
  END IF;

  -- Jadvallar, ketma-ketliklar, viewlar (extension obyektlari CHETDA).
  FOR r IN
    SELECT c.relname AS nom, c.relkind AS tur
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_depend d
      ON d.objid = c.oid AND d.deptype = 'e' AND d.classid = 'pg_class'::regclass
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'S', 'v', 'm')
      AND d.objid IS NULL
      -- Jadvalga bog'langan (SERIAL/IDENTITY) ketma-ketliklar CHETDA: ularning
      -- egasini mustaqil o'zgartirib bo'lmaydi, jadval bilan birga ko'chadi.
      AND NOT (c.relkind = 'S' AND EXISTS (
        SELECT 1 FROM pg_depend dep
        WHERE dep.classid = 'pg_class'::regclass AND dep.objid = c.oid
          AND dep.refclassid = 'pg_class'::regclass AND dep.deptype IN ('a', 'i')
      ))
      AND pg_get_userbyid(c.relowner) <> maqsad
  LOOP
    EXECUTE format('%s public.%I OWNER TO %I',
      CASE r.tur
        WHEN 'S' THEN 'ALTER SEQUENCE'
        WHEN 'v' THEN 'ALTER VIEW'
        WHEN 'm' THEN 'ALTER MATERIALIZED VIEW'
        ELSE 'ALTER TABLE'
      END, r.nom, maqsad);
    n_relation := n_relation + 1;
  END LOOP;

  -- Enum va domain tiplari (migratsiyalar ularni ALTER TYPE qiladi).
  FOR r IN
    SELECT t.typname AS nom
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    LEFT JOIN pg_depend d
      ON d.objid = t.oid AND d.deptype = 'e' AND d.classid = 'pg_type'::regclass
    WHERE n.nspname = 'public'
      AND t.typtype IN ('e', 'd')
      AND d.objid IS NULL
      AND pg_get_userbyid(t.typowner) <> maqsad
  LOOP
    EXECUTE format('ALTER TYPE public.%I OWNER TO %I', r.nom, maqsad);
    n_tip := n_tip + 1;
  END LOOP;

  RAISE NOTICE 'Egasi almashtirildi: % relation, % tip', n_relation, n_tip;
END $$;

-- Yangi migratsiyalar yangi jadval/tip yarata olishi uchun.
GRANT USAGE, CREATE ON SCHEMA public TO ${ident(maqsad)};

-- Natija: egalik taqsimoti (kutilgan holat — barchasi maqsad rolda).
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

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const toArg = process.argv.find((a) => a.startsWith('--to='))?.slice('--to='.length);
  const maqsad = (toArg ?? process.env.DATABASE_USER ?? '').trim();

  if (!maqsad) {
    throw new Error(
      "Maqsad rol aniqlanmadi. `--to=<rol>` bering yoki DATABASE_USER o'rnating.",
    );
  }

  if (process.argv.includes('--print-sql')) {
    console.log(sqlChiqar(maqsad));
    return;
  }

  const { options, tavsif, alohidaUlanish } = migrationConnection();
  const dataSource = new DataSource(options);

  await dataSource.initialize();
  try {
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
    const relationlar = (await dataSource.query(RELATION_SQL, [maqsad])) as Relation[];
    const tiplar = (await dataSource.query(TIP_SQL, [maqsad])) as { nom: string; ega: string }[];

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
