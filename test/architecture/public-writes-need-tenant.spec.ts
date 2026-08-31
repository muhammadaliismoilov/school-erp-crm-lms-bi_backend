import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Arxitektura qorovuli: AUTH'SIZ YOZUV TENANTSIZ QOLMASIN.
 *
 * NestJS'da tenant konteksti `TenantScopeInterceptor` orqali `req.user` dan
 * to'ldiriladi. Autentifikatsiyasiz endpointda `req.user` yo'q — ya'ni kontekst
 * BO'SH qoladi, `TenantWriteSubscriber` hech narsa qo'ymaydi, va yozilgan qator
 * `school_id = NULL` bilan tushadi.
 *
 * Bu jim xato: yozuv muvaffaqiyatli qaytadi, lekin `applyTenantScope` faqat
 * qiymat bor bo'lsa filtr qo'ygani uchun qator maktab xodimiga KO'RINMAY
 * qoladi. Aynan shu 2026-08-31 da `createPublicAppeal` da topildi: public
 * havoladan kelgan har bir murojaat egasiz tushardi va uni faqat "Barcha
 * maktablar" rejimidagi bosh ofis ko'rardi.
 *
 * Qoida: autentifikatsiyasiz controller chaqiradigan service metodi YOZSA,
 * u tenant kontekstini O'ZI o'rnatishi shart — kontekstni so'rovni
 * autentifikatsiya qilgan artefaktdan olib (havola, qurilma va h.k.).
 */
const SRC = join(__dirname, '..', '..', 'src');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const sourceFiles = walk(SRC).filter((file) => file.endsWith('.ts'));

/** Yozuv amallari — bularning biri bo'lsa metod "yozadi" deb hisoblanadi. */
const WRITE_CALLS = /\.(save|insert|update|delete|softDelete|softRemove|remove|upsert|increment|decrement)\(/;

/**
 * Autentifikatsiyasiz yozuvga ATAYLAB ruxsat berilgan metodlar — har biri
 * sababi bilan. Yangi yozuv qo'shishdan oldin o'ylab ko'ring: metod haqiqatan
 * tenantsiz yozishi kerakmi, yoki kontekstni o'rnatishni unutdikmi?
 */
const WRITES_WITHOUT_TENANT: Record<string, string> = {};

/** `@UseGuards(...)` ichida JwtAuthGuard bormi (izohdagi eslatma hisobga olinmaydi). */
function isAuthenticated(content: string): boolean {
  return /@UseGuards\([^)]*JwtAuthGuard/.test(content);
}

/** Controller konstruktoridagi `private readonly x: XService` juftliklari. */
function injectedServices(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const ctor = content.match(/constructor\(([\s\S]*?)\)\s*\{/);
  if (!ctor) return map;
  for (const hit of ctor[1].matchAll(/(?:private|public|protected)\s+(?:readonly\s+)?(\w+)\s*:\s*(\w+)/g)) {
    map.set(hit[1], hit[2]);
  }
  return map;
}

/**
 * Berilgan class ichidagi metod TANASI.
 *
 * Tana boshini "birinchi `{`" deb olish YETMAYDI: qaytish turi
 * `Promise<{ id: string }>` bo'lsa, o'sha qavs oldin uchraydi va qorovul metod
 * o'rniga tur ta'rifini o'qib, hech narsa topmasdan yashil qolardi. Shuning
 * uchun avval parametr qavsi YOPILADI, so'ng burchak qavslar (`<...>`)
 * chuqurligi nolga tushgan birinchi `{` olinadi.
 */
function methodBody(content: string, method: string): string | null {
  const signature = new RegExp(`\\n\\s{2}(?:public\\s+|private\\s+|protected\\s+)?(?:async\\s+)?${method}\\s*(?:<[^>]*>)?\\(`);
  const start = content.search(signature);
  if (start === -1) return null;

  const paramsOpen = content.indexOf('(', start);
  if (paramsOpen === -1) return null;
  let parens = 0;
  let paramsClose = -1;
  for (let i = paramsOpen; i < content.length; i += 1) {
    if (content[i] === '(') parens += 1;
    else if (content[i] === ')') {
      parens -= 1;
      if (parens === 0) {
        paramsClose = i;
        break;
      }
    }
  }
  if (paramsClose === -1) return null;

  let angles = 0;
  let open = -1;
  for (let i = paramsClose + 1; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '<') angles += 1;
    else if (ch === '>') angles -= 1;
    else if (ch === '{' && angles === 0) {
      open = i;
      break;
    }
  }
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < content.length; i += 1) {
    if (content[i] === '{') depth += 1;
    else if (content[i] === '}') {
      depth -= 1;
      if (depth === 0) return content.slice(open, i + 1);
    }
  }
  return null;
}

const classFileCache = new Map<string, string | null>();
function findClassFile(className: string): string | null {
  if (classFileCache.has(className)) return classFileCache.get(className) ?? null;
  const needle = new RegExp(`export class ${className}\\b`);
  const found = sourceFiles.find((file) => needle.test(readFileSync(file, 'utf8'))) ?? null;
  classFileCache.set(className, found);
  return found;
}

interface Offender {
  service: string;
  method: string;
  controller: string;
}

function findUnprotectedWrites(): Offender[] {
  const offenders: Offender[] = [];

  for (const file of sourceFiles) {
    if (!file.endsWith('.controller.ts')) continue;
    const content = readFileSync(file, 'utf8');
    if (isAuthenticated(content)) continue;

    const services = injectedServices(content);
    if (services.size === 0) continue;

    for (const [property, className] of services) {
      const serviceFile = findClassFile(className);
      if (!serviceFile) continue;
      const serviceSource = readFileSync(serviceFile, 'utf8');

      const called = new Set(
        [...content.matchAll(new RegExp(`this\\.${property}\\.(\\w+)\\(`, 'g'))].map((m) => m[1]),
      );

      for (const method of called) {
        const body = methodBody(serviceSource, method);
        if (!body || !WRITE_CALLS.test(body)) continue;
        if (body.includes('this.tenant.set(')) continue;
        const key = `${className}.${method}`;
        if (key in WRITES_WITHOUT_TENANT) continue;
        offenders.push({
          service: className,
          method,
          controller: file.slice(SRC.length + 1),
        });
      }
    }
  }

  return offenders;
}

describe("auth'siz yozuv tenantsiz qolmasin", () => {
  it('autentifikatsiyasiz controller chaqirgan har bir yozuvchi metod tenant kontekstini o‘rnatadi', () => {
    const offenders = findUnprotectedWrites().map(
      (o) => `${o.service}.${o.method}  (${o.controller})`,
    );
    expect(offenders).toEqual([]);
  });

  it('qorovul haqiqatan auth‘siz controllerlarni topadi (o‘lik sinov emas)', () => {
    // Qoida hech qanday faylni ko'rmasa, yuqoridagi sinov abadiy yashil qolardi.
    const unauthenticated = sourceFiles
      .filter((file) => file.endsWith('.controller.ts'))
      .filter((file) => !isAuthenticated(readFileSync(file, 'utf8')));

    expect(unauthenticated.length).toBeGreaterThan(0);
  });

  it('istisno ro‘yxati eskirmagan', () => {
    const live = new Set(
      findUnprotectedWrites().map((o) => `${o.service}.${o.method}`),
    );
    // Ro'yxatdagi yozuv endi kerak bo'lmasa — olib tashlansin.
    const stale = Object.keys(WRITES_WITHOUT_TENANT).filter((key) => !live.has(key));
    expect(stale).toEqual([]);
  });
});
