// Yakuniy to'ldirish: har o'quvchiga kamida bitta to'lov (hali yo'q
// bo'lganlar uchun) va har maktabga 300 tagacha lid. O'chirmaydi.
// Ishga tushirish: node scripts/seed-elegant-uno-topup.mjs
import { readFileSync } from 'node:fs';

const BASE = process.env.SEED_BASE || 'http://localhost:5000/api/v1';
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const PAY = {
  naqd: 'bbde0734-42a9-48c4-850c-0edea8a017ef',
  karta: 'd97b5196-6efc-4481-be37-b557c2d9d1b8',
  click: 'ab62d623-998f-452f-b3a0-bb01680879ed',
  payme: 'd242e4c8-dd86-4049-b9c6-4c442deb1026',
};

const SCHOOLS = {
  'f7ed51a1-63a5-4d98-9472-f4aad4f96626': 'Elegant School',
  '181167f2-0d4a-4fb9-8eb3-d553ce3d60ef': 'Uno',
};
const LEADS_TARGET = 300;

let TOKEN = '';
let CURRENT_SCHOOL_ID = '';
const stats = {};
const bump = (k, n = 1) => (stats[k] = (stats[k] || 0) + n);

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(TOKEN ? { 'X-School-Id': CURRENT_SCHOOL_ID } : {}),
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
    await api('POST', path, body);
    bump(label);
  } catch (e) {
    bump(`${label}_error`);
    if ((stats[`${label}_error`] || 0) <= 3) console.warn(`  ⚠︎ ${label}: ${e.message}`);
  }
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (n, w = 3) => String(n).padStart(w, '0');
const UZ_PREFIXES = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88', '20'];
const phone = () => `+998${rand(UZ_PREFIXES)}${pad(Math.floor(Math.random() * 9999999), 7)}`;
const firstM = ['Ali', 'Sardor', 'Jasur', 'Bexruz', 'Doston', 'Umar', 'Sherzod', 'Diyor'];
const firstF = ['Sevara', 'Madina', 'Nilufar', 'Sarvara', 'Gulnoza', 'Dildora', 'Zarina', 'Kamila'];
const lasts = ['Valiyev', 'Karimov', 'Tosheva', 'Ergasheva', 'Sobirov', 'Yusupova', 'Rahimov', 'Ismoilova'];

async function main() {
  const auth = await api('POST', '/auth/login', { login: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK (${env.ADMIN_USERNAME})`);

  // 1) To'lovsiz o'quvchilarga to'lov (DB'dan oldindan olingan ro'yxat)
  const csvPath = process.env.NO_PAYMENT_CSV;
  const csv = readFileSync(csvPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  console.log(`\n▶ To'lovsiz o'quvchilar: ${csv.length}`);
  const payTypes = Object.values(PAY);
  for (const line of csv) {
    const [studentId, schoolId, feeRaw] = line.split(',');
    const fee = Number(feeRaw) || 1800000;
    CURRENT_SCHOOL_ID = schoolId;
    const months = [9, 10, 11].slice(0, 2 + Math.floor(Math.random() * 2));
    for (const m of months) {
      const full = Math.random() > 0.25;
      await tryCreate('payments', '/student-payments', {
        studentId,
        amount: full ? fee : Math.round(fee * 0.6),
        planAmount: fee,
        paymentTypeId: rand(payTypes),
        paymentDate: `2026-${pad(m, 2)}-05`,
        month: m,
        year: 2026,
        status: full ? 'paid' : 'partial',
        note: 'topup seed to\'lovi',
      });
    }
  }
  console.log(`  ✓ to'lovlar: +${stats.payments || 0} (xato: ${stats.payments_error || 0})`);

  // 2) Lidlarni 300 tagacha to'ldirish
  for (const [schoolId, label] of Object.entries(SCHOOLS)) {
    CURRENT_SCHOOL_ID = schoolId;
    const leadsResp = await api('GET', '/crm/leads?page=1&limit=1');
    const current = leadsResp?.meta?.total ?? 0;
    const need = Math.max(0, LEADS_TARGET - current);
    console.log(`\n▶ ${label}: lidlar hozir=${current}, kerak=+${need}`);
    for (let i = 0; i < need; i++) {
      const male = i % 2 === 0;
      await tryCreate('leads', '/crm/leads', {
        firstName: male ? rand(firstM) : rand(firstF),
        lastName: rand(lasts),
        phone: phone(),
        status: rand(['new', 'contacted', 'interested', 'trial_lesson', 'contract', 'rejected']),
        notes: 'topup seed lidi',
      });
    }
  }

  console.log('\n════════ NATIJA ════════');
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(16)}: ${v}`);
  console.log('═════════════════════════');
}

main().catch((e) => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
