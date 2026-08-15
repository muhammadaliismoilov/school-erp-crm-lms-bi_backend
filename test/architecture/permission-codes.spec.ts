import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import {
  AppPermission,
  DEFAULT_PERMISSION_CODES,
  READ_BUNDLES,
  WRITE_BUNDLES,
  LEGACY_MANAGE_CODES,
} from '../../src/common/constants/permissions';
import { ACTION_LABEL } from '../../src/common/constants/permission-catalog';

/**
 * Arxitektura qorovuli: ruxsat kodlari yaxlitligi.
 *
 * Eng xavfli xato — JIM xato. `@Permissions([...])` ichiga katalogda yo'q kod
 * yozilsa, kompilyator indamaydi, endpoint esa hech kimga ochilmay qoladi
 * (yoki teskarisi: kod bazada bo'lmasa, rol uni hech qachon ololmaydi).
 * Shu sabab dekoratorlardagi kodlarni manba matnidan yig'ib tekshiramiz.
 *
 * `manage` esa qaytib kirib qolmasligi kerak: 1789900000000 migratsiyasi uni
 * bazadan o'chirgan, ya'ni yangi `<module>.manage` kodi hech qachon hech
 * qanday rolga tushmaydi — u yozilgan endpoint jimgina yopiq qolardi.
 *
 * Va eng kuchli invariant — O'LIK KOD BO'LMASIN (T-01): katalogdagi har bir
 * kodni kamida bitta endpoint talab qilishi shart. O'lik kod o'z-o'zicha
 * zararsiz ko'rinadi, lekin frontend uni menyu darvozasi qilib oladi va
 * "ruxsat bor, menyu yo'q" holati tug'iladi — aynan shu 21 ta keng
 * `<module>.read` kodi bilan sodir bo'lgan edi (1790200000000 migratsiyasi).
 */
const SRC = join(__dirname, '..', '..', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(SRC).filter((file) => file.endsWith('.ts'));
const knownCodes = new Set<string>(DEFAULT_PERMISSION_CODES);

describe('ruxsat kodlari katalogi', () => {
  it("hech bir kod `.manage` bilan tugamaydi", () => {
    const manageCodes = DEFAULT_PERMISSION_CODES.filter((code) => code.endsWith('.manage'));
    expect(manageCodes).toEqual([]);
  });

  it("`manage` amali katalog yorliqlarida ham qolmagan", () => {
    expect(Object.keys(ACTION_LABEL)).not.toContain('manage');
  });

  it('har bir kod `<resurs>.<amal>` shaklida', () => {
    const malformed = DEFAULT_PERMISSION_CODES.filter(
      (code) => !/^[a-z0-9-]+\.[a-z0-9-]+$/.test(code) && code !== '*.*',
    );
    expect(malformed).toEqual([]);
  });

  it('kodlar takrorlanmaydi', () => {
    expect(new Set(DEFAULT_PERMISSION_CODES).size).toBe(DEFAULT_PERMISSION_CODES.length);
  });
});

describe('WRITE_BUNDLES', () => {
  it("faqat katalogda mavjud kodlarni o'z ichiga oladi", () => {
    const unknown = Object.entries(WRITE_BUNDLES).flatMap(([module, codes]) =>
      codes.filter((code) => !knownCodes.has(code)).map((code) => `${module}: ${code}`),
    );
    expect(unknown).toEqual([]);
  });

  it("faqat YOZUV kodlarini saqlaydi (`.read` tushib qolmagan)", () => {
    const reads = Object.entries(WRITE_BUNDLES).flatMap(([module, codes]) =>
      codes.filter((code) => code.endsWith('.read')).map((code) => `${module}: ${code}`),
    );
    expect(reads).toEqual([]);
  });

  it('eski manage kodlari ro‘yxati bilan bir xil kalitlarga ega', () => {
    expect(LEGACY_MANAGE_CODES.length).toBe(Object.keys(WRITE_BUNDLES).length);
    expect(LEGACY_MANAGE_CODES.every((code) => code.endsWith('.manage'))).toBe(true);
  });
});

/**
 * Endpointlar talab qiladigan kodlar — controller manbasidan.
 *
 * Segmentli usul: marshrut dekoratoridan KEYINGI marshrut dekoratorigacha
 * bo'lgan matn shu handlerga tegishli. Bir qatorli
 * (`@Get('x') @Permissions([...]) fn()`) va ko'p qatorli uslublarning ikkalasi
 * ham to'g'ri o'qiladi — oyna (window) asosidagi usul qo'shni endpointning
 * kodlarini olib qo'yardi.
 */
function codesRequiredByEndpoints(): Set<string> {
  const catalog = AppPermission as Record<string, string>;
  const required = new Set<string>();
  const routeRe = /@(?:Get|Post|Patch|Put|Delete|All)\(/g;

  for (const file of sourceFiles) {
    if (!file.endsWith('.controller.ts')) continue;
    const content = readFileSync(file, 'utf8');
    const hits = [...content.matchAll(routeRe)];
    for (const [index, hit] of hits.entries()) {
      const end = index + 1 < hits.length ? hits[index + 1].index! : content.length;
      const segment = content.slice(hit.index! + hit[0].length, end);
      const perms = segment.match(/@Permissions\(\[([^\]]*)\]/);
      if (!perms) continue;
      for (const ref of perms[1].matchAll(/AppPermission\.([A-Z0-9_]+)/g)) {
        const code = catalog[ref[1]];
        if (code) required.add(code);
      }
    }
  }
  return required;
}

/**
 * Endpointsiz bo'lishi ATAYLAB to'g'ri bo'lgan kodlar — har biri sababi bilan.
 * Ro'yxatga yangi yozuv qo'shishdan oldin o'ylab ko'ring: kod haqiqatan
 * endpointsiz kerakmi, yoki uni talab qiladigan guard yozishni unutdikmi?
 */
const CODES_WITHOUT_ENDPOINT: Record<string, string> = {
  '*.*': 'texnik super-admin wildcard — guardda emas, matcherda qoplaydi',
};

describe("o'lik kod bo'lmasligi (T-01 qorovuli)", () => {
  const required = codesRequiredByEndpoints();

  it('controllerlardan yetarlicha kod yig\'ildi (skaner ishlayotganining kafolati)', () => {
    expect(required.size).toBeGreaterThan(100);
  });

  it('katalogdagi har bir kodni kamida bitta endpoint talab qiladi', () => {
    const dead = DEFAULT_PERMISSION_CODES.filter(
      (code) => !required.has(code) && !(code in CODES_WITHOUT_ENDPOINT),
    );
    expect(dead).toEqual([]);
  });

  it('istisno ro\'yxati eskirmagan (endpoint paydo bo\'lsa — yozuv olib tashlansin)', () => {
    const stale = Object.keys(CODES_WITHOUT_ENDPOINT).filter((code) => required.has(code));
    expect(stale).toEqual([]);
  });

  it('keng `<module>.read` kodlari faqat haqiqiy endpointlari borlarida qolgan', () => {
    // Bir segmentli modul kodi (`hr.read`) — sub-resurslar `hr-staff.read`
    // ko'rinishida. Bunday kod faqat o'zi endpointda ishlatilsa yashaydi.
    const broadReads = DEFAULT_PERMISSION_CODES.filter(
      (code) => code.endsWith('.read') && !code.startsWith('*'),
    ).filter((code) => required.has(code));
    // Hech bo'lmaganda tirik keng kodlar hali ham shu yerda:
    expect(broadReads).toEqual(expect.arrayContaining(['students.read', 'finance.read']));
  });
});

describe('READ_BUNDLES', () => {
  it("faqat katalogda mavjud kodlarni o'z ichiga oladi", () => {
    const unknown = Object.entries(READ_BUNDLES).flatMap(([module, codes]) =>
      codes.filter((code) => !knownCodes.has(code)).map((code) => `${module}: ${code}`),
    );
    expect(unknown).toEqual([]);
  });

  it("faqat O'QISH kodlarini saqlaydi", () => {
    const writes = Object.entries(READ_BUNDLES).flatMap(([module, codes]) =>
      codes.filter((code) => !code.endsWith('.read')).map((code) => `${module}: ${code}`),
    );
    expect(writes).toEqual([]);
  });
});

describe('@Permissions dekoratorlari', () => {
  /** Manbadagi `AppPermission.X` murojaatlarini yig'ib, kodga aylantiradi. */
  const referencedKeys = new Set<string>();
  for (const file of sourceFiles) {
    if (file.endsWith('permissions.ts')) continue;
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(/@Permissions\(\[([^\]]*)\]/g)) {
      for (const ref of match[1].matchAll(/AppPermission\.([A-Z0-9_]+)/g)) {
        referencedKeys.add(ref[1]);
      }
    }
  }

  it("kamida bir nechta endpoint topildi (regex buzilmaganini tasdiqlaydi)", () => {
    expect(referencedKeys.size).toBeGreaterThan(50);
  });

  it('har bir murojaat `AppPermission` da mavjud', () => {
    const catalog = AppPermission as Record<string, string>;
    const missing = [...referencedKeys].filter((key) => catalog[key] === undefined);
    expect(missing).toEqual([]);
  });
});
