import 'dotenv/config';
import { readdirSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { migrationConnection } from './migration-connection';

/**
 * Migratsiya tarixini BASELINE qilish (bir martalik xizmat amali).
 *
 * MUAMMO: production sxemasi migratsiyalar orqali emas, boshqa yo'l bilan
 * yaratilgan — `migrations` kuzatuv jadvali bo'sh. Shu holatda oddiy
 * `runMigrations()` BARCHA migratsiyani noldan bajarishga urinadi va
 * birinchisidayoq "relation already exists" bilan yiqiladi (2026-08-25 hodisasi).
 *
 * YECHIM: sxema allaqachon to'g'ri bo'lgani uchun migratsiyalarni QAYTA
 * BAJARMASDAN, ularni "bajarilgan" deb belgilash kifoya. Bu skript aynan
 * shuni qiladi: `migrations` jadvaliga (timestamp, name) qatorlarini yozadi.
 * HECH QANDAY DDL bajarilmaydi — na CREATE, na ALTER, na DROP.
 *
 * XAVFSIZLIK:
 *  - Standart rejim — DRY-RUN: nima yozilishini ko'rsatadi, hech narsa yozmaydi.
 *    Haqiqiy yozish uchun `--apply` kerak.
 *  - Yozishdan oldin sxema kutilgan holatda ekani tekshiriladi (qorovul):
 *    sxema mos kelmasa baseline NOTO'G'RI bo'lardi, shuning uchun to'xtaydi.
 *  - Faqat QO'SHADI (`ON CONFLICT DO NOTHING` mantig'i) — hech qachon
 *    o'chirmaydi va mavjud qatorni o'zgartirmaydi. Qayta ishga tushirish xavfsiz.
 *
 * Ishga tushirish:
 *   node dist/src/database/baseline-migrations.js             # dry-run
 *   node dist/src/database/baseline-migrations.js --apply     # yozadi
 *   node dist/src/database/baseline-migrations.js --print-sql # SQL chiqaradi
 *
 * `--print-sql` — bazaga ULANMAYDI: qorovuli va idempotentligi ichiga
 * o'rnatilgan yagona SQL blokini chiqaradi. Konteynerga kira olmaganda
 * (masalan Render Free tarifida shell yo'q) shu SQL'ni bevosita baza
 * konsolida (Supabase SQL Editor) bajarish mumkin — mantiq bu fayldan
 * chiqqani uchun ikkinchi "haqiqat manbasi" paydo bo'lmaydi.
 */

/** Sxema haqiqatan kutilgan holatdami — baseline'dan oldingi qorovul. */
const SCHEMA_GUARDS: { savol: string; sql: string }[] = [
  {
    savol: "'roles' jadvali bormi",
    sql: `select to_regclass('public.roles') is not null as ok`,
  },
  {
    savol: "eng yangi migratsiya ustuni ('roles.is_privileged') qo'llanganmi",
    sql: `select count(*) > 0 as ok from information_schema.columns
          where table_schema='public' and table_name='roles' and column_name='is_privileged'`,
  },
  {
    savol: "'permissions' jadvali bormi",
    sql: `select to_regclass('public.permissions') is not null as ok`,
  },
];

interface MigrationFayl {
  timestamp: number;
  name: string;
  fayl: string;
}

/**
 * Kompilyatsiya qilingan migratsiyalarni o'qiydi va TypeORM qanday nom
 * yozsa — xuddi shunday nomni hisoblaydi (`instance.name ?? klass nomi`).
 * Fayl nomidan taxmin qilmaymiz: nom noto'g'ri bo'lsa baseline yolg'on
 * bo'lib qolardi va migratsiya keyin qayta ishga tushib ketardi.
 */
function migratsiyalarniOqi(katalog: string): MigrationFayl[] {
  const natija: MigrationFayl[] = [];

  for (const fayl of readdirSync(katalog).sort()) {
    if (!fayl.endsWith('.js')) continue;

    const toLiqYol = join(katalog, fayl);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const modul = require(toLiqYol) as Record<string, unknown>;

    for (const eksport of Object.values(modul)) {
      if (typeof eksport !== 'function') continue;
      const Klass = eksport as new () => { name?: string };
      let nusxa: { name?: string };
      try {
        nusxa = new Klass();
      } catch {
        continue;
      }
      const name = nusxa.name ?? Klass.name;
      const timestamp = Number.parseInt(fayl.split('-')[0], 10);
      if (!Number.isFinite(timestamp)) continue;
      natija.push({ timestamp, name, fayl });
      break;
    }
  }

  return natija.sort((a, b) => a.timestamp - b.timestamp);
}

/** SQL matnidagi apostrofni ekranlash. */
const sqlLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Bazaga ulanmasdan, o'z-o'zini himoya qiladigan SQL blokini chiqaradi:
 *  - DO bloki sxema qorovulini bajaradi va mos kelmasa EXCEPTION beradi
 *    (tranzaksiya butunlay bekor bo'ladi — yarim yozilgan holat bo'lmaydi);
 *  - INSERT ... WHERE NOT EXISTS — idempotent, takroran bajarish xavfsiz.
 */
function sqlChiqar(migratsiyalar: MigrationFayl[]): string {
  const values = migratsiyalar
    .map((m) => `  (${m.timestamp}, ${sqlLiteral(m.name)})`)
    .join(',\n');

  return `-- Migratsiya tarixini BASELINE qilish (${migratsiyalar.length} ta yozuv).
-- Manba: src/database/baseline-migrations.ts --print-sql
-- HECH QANDAY sxema o'zgarishi yo'q: faqat "bu migratsiyalar allaqachon
-- qo'llangan" degan qatorlar yoziladi. Takroran bajarish xavfsiz.
BEGIN;

-- Qorovul: sxema kutilgan holatda bo'lmasa, butun blok bekor bo'ladi.
DO $$
BEGIN
  IF to_regclass('public.roles') IS NULL THEN
    RAISE EXCEPTION 'Qorovul: "roles" jadvali yo''q — bu kutilgan baza emas';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'is_privileged'
  ) THEN
    RAISE EXCEPTION 'Qorovul: "roles.is_privileged" yo''g''i — eng yangi migratsiya qo''llanmagan, baseline noto''g''ri bo''lardi';
  END IF;
  IF to_regclass('public.permissions') IS NULL THEN
    RAISE EXCEPTION 'Qorovul: "permissions" jadvali yo''q — bu kutilgan baza emas';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "migrations" (
  "id" SERIAL NOT NULL,
  "timestamp" bigint NOT NULL,
  "name" character varying NOT NULL,
  CONSTRAINT "PK_migrations_id" PRIMARY KEY ("id")
);

INSERT INTO "migrations" ("timestamp", "name")
SELECT v.ts, v.nm
FROM (VALUES
${values}
) AS v(ts, nm)
WHERE NOT EXISTS (SELECT 1 FROM "migrations" m WHERE m."name" = v.nm);

COMMIT;`;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  if (process.argv.includes('--print-sql')) {
    console.log(sqlChiqar(migratsiyalarniOqi(join(__dirname, 'migrations'))));
    return;
  }

  const { options, tavsif, alohidaUlanish } = migrationConnection();
  const dataSource = new DataSource(options);

  await dataSource.initialize();
  try {
    console.log(apply ? '=== BASELINE (--apply: YOZADI) ===' : '=== BASELINE (dry-run) ===');
    console.log(
      `Ulanish: ${tavsif}` +
        (alohidaUlanish ? ' (alohida MIGRATION_DATABASE_URL)\n' : ' (ilova ulanishi)\n'),
    );

    // 1) Qorovul: sxema kutilgan holatdami?
    console.log('1) Sxema qorovuli:');
    for (const guard of SCHEMA_GUARDS) {
      const [{ ok }] = (await dataSource.query(guard.sql)) as { ok: boolean }[];
      console.log(`   ${ok ? '✓' : '✗'} ${guard.savol}`);
      if (!ok) {
        throw new Error(
          `Qorovul o'tmadi: ${guard.savol}. Sxema kutilgan holatda emas — ` +
            'baseline qilish NOTO\'G\'RI bo\'lardi (migratsiyalar aslida qo\'llanmagan bo\'lishi mumkin).',
        );
      }
    }

    // 2) Kuzatuv jadvali (yo'q bo'lsa — TypeORM bilan bir xil shaklda yaratamiz)
    await dataSource.query(
      `CREATE TABLE IF NOT EXISTS "migrations" (
         "id" SERIAL NOT NULL,
         "timestamp" bigint NOT NULL,
         "name" character varying NOT NULL,
         CONSTRAINT "PK_migrations_id" PRIMARY KEY ("id")
       )`,
    );

    // 3) Manba va bazadagi holatni solishtirish
    const manba = migratsiyalarniOqi(join(__dirname, 'migrations'));
    const mavjud = (await dataSource.query(
      `select "timestamp"::text as ts, "name" from "migrations"`,
    )) as { ts: string; name: string }[];
    const mavjudNomlar = new Set(mavjud.map((m) => m.name));

    const yoziladi = manba.filter((m) => !mavjudNomlar.has(m.name));
    const allaqachon = manba.filter((m) => mavjudNomlar.has(m.name));
    const manbaNomlar = new Set(manba.map((m) => m.name));
    const notanish = mavjud.filter((m) => !manbaNomlar.has(m.name));

    console.log(`\n2) Holat:`);
    console.log(`   manbadagi migratsiyalar : ${manba.length}`);
    console.log(`   bazada allaqachon bor   : ${allaqachon.length}`);
    console.log(`   YOZILADI                : ${yoziladi.length}`);
    console.log(`   bazada bor, manbada yo'q: ${notanish.length}`);

    if (notanish.length > 0) {
      // Arxivlangan (eski) migratsiyalar bo'lishi normal — ular runtime
      // yo'lida emas. Faqat xabar beramiz, hech narsa qilmaymiz.
      console.log(
        `      (${notanish
          .slice(0, 5)
          .map((m) => m.name)
          .join(', ')}${notanish.length > 5 ? ', …' : ''})`,
      );
    }

    if (yoziladi.length === 0) {
      console.log('\n✓ Yozadigan narsa yo\'q — tarix allaqachon to\'liq.');
      return;
    }

    console.log(`\n3) Yoziladigan qatorlar (birinchi 5 va oxirgi 3):`);
    for (const m of yoziladi.slice(0, 5)) console.log(`   ${m.timestamp}  ${m.name}`);
    if (yoziladi.length > 8) console.log(`   … (${yoziladi.length - 8} ta)`);
    for (const m of yoziladi.slice(-3)) console.log(`   ${m.timestamp}  ${m.name}`);

    if (!apply) {
      console.log('\nDRY-RUN — hech narsa yozilmadi. Yozish uchun: --apply');
      return;
    }

    // 4) Yozish — bitta tranzaksiyada (yo hammasi, yo hech biri)
    await dataSource.transaction(async (manager) => {
      for (const m of yoziladi) {
        await manager.query(`INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`, [
          m.timestamp,
          m.name,
        ]);
      }
    });

    console.log(`\n✓ ${yoziladi.length} ta migratsiya "bajarilgan" deb belgilandi.`);
    console.log('  Hech qanday sxema o\'zgarishi qilinmadi.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('\nBaseline bajarilmadi:', error instanceof Error ? error.message : error);
  process.exit(1);
});
