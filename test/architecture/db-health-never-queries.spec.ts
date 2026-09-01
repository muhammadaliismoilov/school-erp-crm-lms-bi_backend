import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Arxitektura qorovuli: SOG'LIQ CHIROG'I BAZAGA SO'ROV YUBORMASIN.
 *
 * Chiroqning butun maqsadi — yuklamani ko'rsatish. Agar u darajani hisoblash
 * uchun bazaga so'rov yuborsa, o'lchov asbobi o'lchayotgan narsani buzadi:
 * yuklama oshgan sayin chiroq ham yuklama qo'shadi va bu o'z-o'zini
 * kuchaytiruvchi halqa hosil qiladi. Eng yomon paytda — baza allaqachon
 * qiynalayotganda — chiroq vaziyatni og'irlashtiradi.
 *
 * Daraja FAQAT xotiradagi hisoblagichlardan va pool ob'yektining
 * maydonlaridan olinadi. `DataSource` ishlatiladi, lekin undan faqat
 * `driver.master` o'qiladi — `query()` hech qachon chaqirilmaydi.
 */
const DIR = join(__dirname, '..', '..', 'src', 'common', 'database', 'db-health');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const files = walk(DIR).filter((file) => file.endsWith('.ts'));

/** SQL bajaradigan chaqiruvlar. */
const SQL_CALLS =
  /\.(query|createQueryBuilder|getRepository|manager|find|findOne|save|insert|update|delete|count)\s*\(/;

describe('sog‘liq chirog‘i bazani yuklamaydi', () => {
  it('fayllar topildi (skaner ishlayotganining kafolati)', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it('hech bir fayl SQL bajarmaydi', () => {
    const offenders = files
      .filter((file) => SQL_CALLS.test(readFileSync(file, 'utf8')))
      .map((file) => relative(DIR, file));
    expect(offenders).toEqual([]);
  });

  it('repository inject qilinmaydi', () => {
    // `@InjectRepository` — bazaga borishning eng oson yo'li; u paydo bo'lishi
    // qoidaning buzilganini bildiradi. `@InjectDataSource` ATAYLAB ruxsat
    // etilgan: undan faqat pool hisoblagichi o'qiladi.
    const offenders = files
      .filter((file) => readFileSync(file, 'utf8').includes('@InjectRepository'))
      .map((file) => relative(DIR, file));
    expect(offenders).toEqual([]);
  });
});
