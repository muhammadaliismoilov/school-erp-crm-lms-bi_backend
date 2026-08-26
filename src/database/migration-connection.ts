import type { DataSourceOptions } from 'typeorm';

/**
 * Migratsiya skriptlari uchun ulanish sozlamalari.
 *
 * ODATDAGI HOLAT: `MIGRATION_DATABASE_URL` berilmaydi va migratsiya ilovaning
 * o'z ulanishi (`DATABASE_*`) bilan ishlaydi. Production'da bu 2026-08-26 dan
 * buyon mumkin — sxema egaligi ilova roliga (`app_backend`) o'tkazilgan
 * (`transfer-ownership.ts`), shuning uchun `ALTER TABLE` o'tadi.
 *
 * IXTIYORIY ZAXIRA: agar ilova roli biror bazada egalikka ega bo'lmasa
 * (`must be owner of table roles`), migratsiya paytigina ishlatiladigan
 * alohida ulanish berish mumkin:
 *
 *   MIGRATION_DATABASE_URL=postgresql://<egasi>:<parol>@<host>:5432/<baza>
 *
 * Buni ishlatishdan oldin o'ylab ko'ring: Render Free tarifida Pre-Deploy
 * bosqichi yo'q, ya'ni bu parol ilovaning o'z muhitida (`process.env`) turadi
 * va "eng kam huquq" foydasi kutilganidan ancha kam bo'ladi.
 *
 * O'zgaruvchi berilmasa, odatdagi `DATABASE_*` sozlamalariga qaytadi — lokal
 * ishlab chiqishda hech narsa o'zgarmaydi.
 *
 * MUHIM: bu o'zgaruvchini FAQAT migratsiya skriptlari o'qiydi. Ilovaning
 * ish vaqtidagi sozlamasi (`config/database.config.ts`) unga umuman
 * tegmaydi — aks holda ajratishning ma'nosi qolmasdi.
 *
 * Supabase + Render eslatmasi (2026-08-25 da amalda tekshirilgan):
 *  - Direct connection (`db.<ref>.supabase.co:5432`) faqat IPv6 manzilga ega;
 *    Render IPv6 chiqishini qo'llab-quvvatlamaydi va `ENETUNREACH` beradi.
 *  - SESSION pooler (`…pooler.supabase.com:5432`, foydalanuvchi
 *    `postgres.<ref>`) — IPv4, oddiy ulanish kabi ishlaydi. SHU ishlatilsin.
 *  - TRANSACTION pooler (6543) sessiya holatini saqlamaydi — migratsiyaga
 *    yaramaydi.
 */

const sslKerakmi = (): false | { rejectUnauthorized: boolean } =>
  process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

export interface MigrationConnection {
  options: DataSourceOptions;
  /** Logga chiqarish uchun xavfsiz ta'rif — parol HECH QACHON kirmaydi. */
  tavsif: string;
  /** Alohida migratsiya ulanishi ishlatilyaptimi (yoki ilovaniki). */
  alohidaUlanish: boolean;
}

/** Parolni ko'rsatmasdan, ulanishni tanib olish uchun qisqa ta'rif. */
function xavfsizTavsif(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.username}@${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    return '(URL o‘qib bo‘lmadi)';
  }
}

export function migrationConnection(qoshimcha: Partial<DataSourceOptions> = {}): MigrationConnection {
  const url = process.env.MIGRATION_DATABASE_URL?.trim();

  if (url) {
    return {
      alohidaUlanish: true,
      tavsif: xavfsizTavsif(url),
      options: {
        type: 'postgres',
        url,
        ssl: sslKerakmi(),
        ...qoshimcha,
      } as DataSourceOptions,
    };
  }

  const host = process.env.DATABASE_HOST ?? 'localhost';
  const database = process.env.DATABASE_NAME ?? 'yuton_school';
  const username = process.env.DATABASE_USER ?? 'yuton';

  return {
    alohidaUlanish: false,
    tavsif: `${username}@${host}:${process.env.DATABASE_PORT ?? '5432'}/${database}`,
    options: {
      type: 'postgres',
      host,
      port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username,
      password: process.env.DATABASE_PASSWORD ?? 'yuton',
      database,
      ssl: sslKerakmi(),
      ...qoshimcha,
    } as DataSourceOptions,
  };
}
