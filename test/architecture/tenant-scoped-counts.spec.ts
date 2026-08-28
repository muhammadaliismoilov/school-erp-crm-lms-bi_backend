import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Architecture guard: servislarda filtrsiz `.count()` bo'lmasin.
 *
 * NEGA: bu naqsh UCH marta takrorlandi (2026-08-28) — `schools`, `users` va
 * yana beshta joyda. Har safar bir xil: RO'YXAT `applyTenantScope`/`tenantWhere`
 * bilan to'g'ri filtrlanadi, ustidagi STATISTIKA esa unutiladi. Natijada
 * maktab direktori o'z sahifasida butun platformaning raqamini ko'radi.
 *
 * `reports.service.ts` eng gapiruvchi misol edi: uchta `count()` dan ikkitasi
 * `tenantWhere` bilan, uchinchisi esa filtrsiz. Ya'ni bu qaror emas, e'tibordan
 * chetda qolish — demak uni odam emas, test ushlashi kerak.
 *
 * Qoida: `repo.count()` argumentsiz chaqirilmasin. Tenant filtri kerak
 * bo'lmagan (haqiqatan global) jadvallar quyidagi ro'yxatda, sababi bilan.
 */
const SRC = join(__dirname, '..', '..', 'src');

/** Argumentsiz `.count()` ruxsat etilgan joylar — har biri sabab bilan. */
const ALLOWLIST: { file: string; sabab: string }[] = [
  {
    file: 'modules/identity/roles.service.ts',
    sabab: "`permissions` jadvalida `school_id` YO'Q — ruxsat kodlari butun tizim uchun yagona.",
  },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('tenant-scoped counts', () => {
  it("servislarda argumentsiz `.count()` yo'q (allowlist'dan tashqari)", () => {
    const ruxsatEtilgan = new Set(ALLOWLIST.map((entry) => entry.file));

    const buzilgan = walk(SRC)
      .filter((file) => file.endsWith('.service.ts'))
      .flatMap((file) => {
        const nisbiy = relative(SRC, file).split('\\').join('/');
        if (ruxsatEtilgan.has(nisbiy)) return [];

        return readFileSync(file, 'utf8')
          .split('\n')
          .map((line, index) => ({ line, no: index + 1 }))
          // Izoh qatorlari hisobga olinmaydi — ular kodni bajarmaydi.
          .filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line))
          .filter(({ line }) => /\.count\(\s*\)/.test(line))
          .map(({ no, line }) => `${nisbiy}:${no}  ${line.trim()}`);
      });

    expect(buzilgan).toEqual([]);
  });

  it("allowlist qisqa qolsin — har yozuv sabab bilan izohlangan", () => {
    // Ro'yxat o'sib ketsa, qoida ma'nosini yo'qotadi.
    expect(ALLOWLIST.length).toBeLessThanOrEqual(3);
    for (const entry of ALLOWLIST) {
      expect(entry.sabab.length).toBeGreaterThan(20);
    }
  });
});
