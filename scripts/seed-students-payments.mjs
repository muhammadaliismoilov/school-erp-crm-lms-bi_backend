// Dashboard statistikalari uchun o'quvchilar + to'lovlar seed (o'chirmaydi, faqat qo'shadi).
// Har xil to'lov profillari: a'lo to'lovchi / yaxshi / qisman / muammoli — qarzdorlik va
// tushum grafigi tabiiy ko'rinadi. Ishga tushirish: node scripts/seed-students-payments.mjs
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

// To'lov turlari (shu DB'dagi mavjud UUID'lar — oldingi seed bilan bir xil).
const PAY_TYPES = [
  'bbde0734-42a9-48c4-850c-0edea8a017ef', // naqd
  'd97b5196-6efc-4481-be37-b557c2d9d1b8', // karta
  'ab62d623-998f-452f-b3a0-bb01680879ed', // click
  'd242e4c8-dd86-4049-b9c6-4c442deb1026', // payme
];

let TOKEN = '';
const stats = {};
const bump = (k, n = 1) => (stats[k] = (stats[k] || 0) + n);

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}`, 'X-School-Id': YUTON_SCHOOL_ID } : {}),
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

async function tryCreate(label, path, body) {
  try {
    const d = await api('POST', path, body);
    bump(label);
    return d;
  } catch (e) {
    console.warn(`  ⚠︎ ${label}: ${e.message}`);
    return null;
  }
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (n, w = 2) => String(n).padStart(w, '0');
const TODAY = new Date().toISOString().slice(0, 10); // 2026-07-04

const FIRST_M = ['Ali', 'Sardor', 'Jasur', 'Bexruz', 'Doston', 'Umar', 'Islom', 'Timur', 'Amir', 'Bilol'];
const FIRST_F = ['Sevara', 'Madina', 'Nilufar', 'Sarvara', 'Gulnoza', 'Dildora', 'Zilola', 'Mohira', 'Rayhona', 'Osiyo'];
const LASTS = ['Valiyev', 'Karimov', 'Toshev', 'Ergashev', 'Sobirov', 'Yusupov', 'Rahimov', 'Ismoilov', 'Nazarov', 'Saidov', 'Mirzayev', 'Qodirov'];

// To'lov profillari: [nomi, ulush, to'langan oylar(2..7), qisman ehtimoli]
// Iyul (7-oy) to'lovi BUGUN amalga oshadi → "Bugungi to'lovlar" jonlanadi.
const PROFILES = [
  { name: 'alo', share: 0.4, months: [2, 3, 4, 5, 6, 7], partialChance: 0 },
  { name: 'yaxshi', share: 0.3, months: [2, 3, 4, 5, 6], partialChance: 0 },
  { name: 'qisman', share: 0.2, months: [2, 3, 4, 5], partialChance: 0.5 },
  { name: 'muammoli', share: 0.1, months: [2, 3], partialChance: 0.5 },
];

function pickProfile(i, total) {
  let acc = 0;
  const x = i / total;
  for (const p of PROFILES) {
    acc += p.share;
    if (x < acc) return p;
  }
  return PROFILES[0];
}

async function main() {
  const auth = await api('POST', '/auth/login', {
    login: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK, TAG=${TAG}, bugun=${TODAY}\n`);

  const TOTAL = 25;
  console.log(`▶ ${TOTAL} ta o'quvchi + to'lovlar...`);

  for (let i = 0; i < TOTAL; i++) {
    const male = i % 2 === 0;
    const firstName = male ? rand(FIRST_M) : rand(FIRST_F);
    const surname = rand(LASTS);
    const lastName = male ? surname : surname + 'a';
    const fee = rand([1800000, 2050000, 2400000, 2800000]);
    const profile = pickProfile(i, TOTAL);

    const st = await tryCreate('o\'quvchi', '/students', {
      firstName,
      lastName,
      gender: male ? 'male' : 'female',
      birthDate: `20${12 + (i % 6)}-${pad((i % 12) + 1)}-${pad((i % 27) + 1)}`,
      preferredLanguage: rand(['uz', 'uz', 'ru']),
      studentCode: `ST-${TAG}-${pad(i + 1, 4)}`,
      status: 'active',
      monthlyFee: fee,
      discountType: 'percent',
      discountValue: rand([0, 0, 0, 10, 15]),
      billingStartDate: '2026-02-01',
      paymentPlan: 'monthly',
      region: 'Xorazm',
      district: rand(['Gurlan', 'Yangibozor', 'Urganch', 'Xiva']),
      personalPhone: `+9989${pad(Math.floor(Math.random() * 99999999), 8)}`,
      guardianFullName: `${surname} ${rand(['Akmal', 'Botir', 'Shavkat', 'Dilshod', 'Olim'])}`,
      guardianRelation: rand(['father', 'mother']),
      guardianPhone: `+9989${pad(Math.floor(Math.random() * 99999999), 8)}`,
    });
    if (!st?.id) continue;

    // To'lovlar — profil bo'yicha (iyul to'lovi bugungi sana bilan).
    for (const m of profile.months) {
      const partial = Math.random() < profile.partialChance;
      const amount = partial ? Math.round(fee * 0.6) : fee;
      const isJuly = m === 7;
      await tryCreate('to\'lov', '/student-payments', {
        studentId: st.id,
        amount,
        planAmount: fee,
        paymentTypeId: rand(PAY_TYPES),
        paymentDate: isJuly ? TODAY : `2026-${pad(m)}-${pad(3 + Math.floor(Math.random() * 9))}`,
        month: m,
        year: 2026,
        status: partial ? 'partial' : 'paid',
        note: `${TAG} seed (${profile.name})`,
      });
    }
    bump(`profil:${profile.name}`);
    if ((i + 1) % 5 === 0) console.log(`  ${i + 1}/${TOTAL}...`);
  }

  console.log('\n════════ NATIJA ════════');
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(18)}: +${v}`);
  console.log(`\nBarcha yozuvlar '${TAG}' belgisi bilan (studentCode/note).`);
}

main().catch((e) => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
