// Qabul bo'limi (CRM) uchun 50 ta har xil test lid — API orqali, o'chirmaydi.
// Ishga tushirish: node scripts/seed-crm-leads.mjs
import { readFileSync } from 'node:fs';

const BASE = process.env.SEED_BASE || 'http://localhost:5000/api/v1';
const YUTON_SCHOOL_ID = '2ca28a71-78f7-44a0-9a23-852c041a28ea';
const TAG = Date.now().toString(36).slice(-5).toUpperCase();

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

let TOKEN = '';
const stats = {};
const bump = (k, n = 1) => (stats[k] = (stats[k] || 0) + n);

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(TOKEN ? { 'X-School-Id': YUTON_SCHOOL_ID } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const msg = json?.error?.message || json?.message || res.statusText;
    throw new Error(`${method} ${path} -> ${res.status} ${msg}`);
  }
  return json.data ?? json;
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;

// ─── Ma'lumot to'plamlari ───────────────────────────────────────────────────

const MALE = ['Aziz', 'Bekzod', 'Davron', 'Eldor', 'Farrux', 'G\'ayrat', 'Humoyun', 'Islom', 'Jasur', 'Kamol', 'Lochin', 'Mirjalol', 'Nodir', 'Otabek', 'Rustam', 'Sardor', 'Temur', 'Ulug\'bek', 'Xurshid', 'Zafar'];
const FEMALE = ['Aziza', 'Barno', 'Dilnoza', 'Ezoza', 'Feruza', 'Gulnora', 'Hilola', 'Iroda', 'Jamila', 'Kamola', 'Lola', 'Malika', 'Nilufar', 'Oysha', 'Ra\'no', 'Sevara', 'Tanzila', 'Umida', 'Xadicha', 'Zulfiya'];
const SURNAMES = ['Karimov', 'Aliyev', 'Rahimov', 'Toshpo\'latov', 'Yusupov', 'Ismoilov', 'Saidov', 'Nazarov', 'Qodirov', 'Mirzayev', 'Abdullayev', 'Ergashev', 'Sobirov', 'Xolmatov', 'Umarov'];

const SOURCE_DEFS = [
  { name: 'Instagram' },
  { name: 'Telegram kanal' },
  { name: 'Tanish-bilish tavsiyasi' },
  { name: 'Sayt (organik)' },
  { name: 'Flayer / banner' },
  { name: 'Ota-onalar yig\'ilishi' },
];

const INTERESTS = [
  '1-sinfga qabul haqida so\'radi',
  '5-sinfga o\'tkazmoqchi (hozir davlat maktabida)',
  'Ingliz tili kursiga qiziqdi (IELTS maqsad)',
  'Matematika olimpiada guruhini so\'radi',
  '2 farzandini birga o\'tkazmoqchi (3- va 6-sinf)',
  'Boshlang\'ich sinf narxlarini so\'radi',
  'Maktab avtobusi bor-yo\'qligini so\'radi',
  'Rus tili sinfi bormi deb qiziqdi',
  'Sport seksiyalari haqida ma\'lumot oldi',
  '9-sinfdan keyin ham davom etish sharti bilan qiziqdi',
  'Chegirma va to\'lov bo\'lib to\'lash shartlarini so\'radi',
  'Yotoqxona (pansion) sharoitini so\'radi',
  'IT yo\'nalishidagi qo\'shimcha darslarga qiziqdi',
  'Bitiruvchilar natijalari (DTM ball) bilan qiziqdi',
  'Ochiq eshiklar kuniga yozildi',
];

const CONTACT_COMMENTS = [
  'Telefon orqali gaplashildi, ma\'lumot yuborildi',
  'Telegram\'da javob berdi, narxlar yuborildi',
  'Qo\'ng\'iroqqa javob bermadi, qayta urinamiz',
  'Ertaga maktabga tashrifga kelishga kelishildi',
  'Sinov darsiga yozildi (shanba 10:00)',
  'Narx qimmatlik qildi, chegirma taklif qilindi',
  'Hujjatlar ro\'yxati yuborildi',
  'Direktor bilan uchrashuv belgilandi',
];

const REJECT_COMMENTS = [
  'Boshqa maktabni tanladi (uyiga yaqin)',
  'Narx to\'g\'ri kelmadi',
  'Ko\'chib ketishdi, keyingi yil qaytishi mumkin',
  'Telefonga umuman javob bermadi (3 urinish)',
];

// Holatlar taqsimoti (50 ta uchun): 15 new, 12 contacted, 10 interested, 6 trial, 4 contract, 3 rejected
const STATUS_PLAN = [
  ...Array(15).fill('new'),
  ...Array(12).fill('contacted'),
  ...Array(10).fill('interested'),
  ...Array(6).fill('trial_lesson'),
  ...Array(4).fill('contract'),
  ...Array(3).fill('rejected'),
];

function makePhone(i) {
  const ops = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88'];
  return `+998${rand(ops)}${String(1000000 + Math.floor(Math.random() * 8999999))}`.slice(0, 13);
}

async function main() {
  const auth = await api('POST', '/auth/login', {
    login: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK (${env.ADMIN_USERNAME}), TAG=${TAG}\n`);

  // 1) Manbalar — yetarli bo'lmasa qo'shamiz (mavjudlarini o'chirmaymiz).
  console.log('▶ Lid manbalari...');
  let sources = await api('GET', '/crm/sources').catch(() => []);
  if (Array.isArray(sources?.items)) sources = sources.items;
  if (!Array.isArray(sources)) sources = [];
  const have = new Set(sources.map((s) => s.name?.toLowerCase()));
  for (const def of SOURCE_DEFS) {
    if (have.has(def.name.toLowerCase())) continue;
    const created = await api('POST', '/crm/sources', def).catch((e) => {
      console.warn(`  ⚠︎ manba: ${e.message}`);
      return null;
    });
    if (created) {
      sources.push(created);
      bump('manba');
    }
  }
  console.log(`  jami manba: ${sources.length}\n`);

  // 2) 50 ta lid — har xil ism/jins/telefon/manba/izoh, keyin holat bo'ylab tarqatiladi.
  console.log('▶ 50 ta lid...');
  for (let i = 0; i < 50; i += 1) {
    const female = chance(0.5);
    const firstName = female ? rand(FEMALE) : rand(MALE);
    const surname = rand(SURNAMES);
    const lastName = female && surname.endsWith('ov') ? surname + 'a' : surname;
    const targetStatus = STATUS_PLAN[i];

    const body = {
      firstName,
      lastName,
      phone: makePhone(i),
      ...(chance(0.55)
        ? { email: `${firstName}.${lastName}${i}@mail.uz`.toLowerCase().replaceAll("'", '') }
        : {}),
      ...(sources.length > 0 && chance(0.9) ? { sourceId: rand(sources).id } : {}),
      notes: `${rand(INTERESTS)} [seed:${TAG}]`,
    };

    const lead = await api('POST', '/crm/leads', body).catch((e) => {
      console.warn(`  ⚠︎ lid ${i + 1}: ${e.message}`);
      return null;
    });
    if (!lead) continue;
    bump('lid');

    // Holatni bosqichma-bosqich ko'chiramiz (kanban tarixi tabiiy ko'rinsin).
    const chain = {
      new: [],
      contacted: ['contacted'],
      interested: ['contacted', 'interested'],
      trial_lesson: ['contacted', 'interested', 'trial_lesson'],
      contract: ['contacted', 'interested', 'trial_lesson', 'contract'],
      rejected: ['contacted', 'rejected'],
    }[targetStatus];

    for (const st of chain) {
      const comment =
        st === 'rejected' ? rand(REJECT_COMMENTS) : st === 'contacted' ? rand(CONTACT_COMMENTS) : undefined;
      await api('PATCH', `/crm/leads/${lead.id}/status`, {
        status: st,
        ...(comment ? { comment } : {}),
      }).catch((e) => console.warn(`  ⚠︎ status ${st}: ${e.message}`));
    }
    bump(`holat:${targetStatus}`);

    // ~40% lidga qo'shimcha izoh.
    if (chance(0.4)) {
      await api('POST', `/crm/leads/${lead.id}/comments`, { body: rand(CONTACT_COMMENTS) }).catch(() => {});
      bump('izoh');
    }

    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/50...`);
  }

  console.log('\n══ NATIJA ══');
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k}: ${v}`);
  console.log(`\nBarcha lidlar notes maydonida [seed:${TAG}] belgisi bilan.`);
}

main().catch((e) => {
  console.error('XATO:', e.message);
  process.exit(1);
});
