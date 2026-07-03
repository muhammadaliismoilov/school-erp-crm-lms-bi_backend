// Yuton School — xodim DAVOMATI va OYLIKLARI uchun API orqali ma'lumot (o'chirmaydi).
// Ishga tushirish: node scripts/seed-yuton-attendance-salary.mjs
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body, retries = 6) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}`, 'X-School-Id': YUTON_SCHOOL_ID } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Rate-limit (429) — kutib qayta urinish
  if (res.status === 429 && retries > 0) {
    await sleep(1500 + (6 - retries) * 500);
    return api(method, path, body, retries - 1);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const msg = json?.error?.message || json?.message || res.statusText;
    const det = JSON.stringify(json?.error?.details || '').slice(0, 200);
    throw new Error(`${method} ${path} -> ${res.status} ${msg} ${det}`);
  }
  return json.data ?? json;
}

async function tryCreate(label, path, body) {
  try {
    await api('POST', path, body);
    bump(label);
    return true;
  } catch (e) {
    if (!stats[`err:${label}`]) console.warn(`  ⚠︎ ${label}: ${e.message}`);
    bump(`err:${label}`);
    return false;
  }
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
const jitter = (base, spread) => base + Math.floor((Math.random() - 0.5) * spread);

async function main() {
  const auth = await api('POST', '/auth/login', { login: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK, TAG=${TAG}\n`);

  // Yuton xodimlari (staff)
  const list = await api('GET', '/hr/staff?limit=100');
  const staff = (list.items || list).map((s) => ({
    id: s.id,
    salary: Number(s.salary) > 0 ? Number(s.salary) : 4500000,
    name: `${s.lastName || ''} ${s.firstName || ''}`.trim(),
  }));
  console.log(`▶ ${staff.length} ta xodim topildi\n`);

  // 1) DAVOMAT — ish kunlari uchun check_in / check_out (tasdiqlangan)
  console.log('▶ Davomat (attendance)...');
  // 2026-yil 22–26 iyun (dushanba–juma) va 29 iyun – 3 iyul
  const workDays = [
    '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26',
    '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02',
  ];
  for (const s of staff) {
    for (const day of workDays) {
      // ba'zilar kelmagan bo'lsin (~10%)
      if (Math.random() < 0.1) continue;
      const inH = pad(8 + Math.floor(Math.random() * 2)); // 08–09
      const inM = pad(Math.floor(Math.random() * 60));
      const outH = pad(17 + Math.floor(Math.random() * 2)); // 17–18
      const outM = pad(Math.floor(Math.random() * 60));
      await tryCreate('attendance', '/hr/attendance', {
        staffMemberId: s.id,
        action: 'check_in',
        recordedAt: `${day}T${inH}:${inM}:00.000Z`,
        latitude: 41.311081,
        longitude: 69.240562,
        status: 'approved',
        deviceInfo: `FaceID terminal (${TAG})`,
      });
      await tryCreate('attendance', '/hr/attendance', {
        staffMemberId: s.id,
        action: 'check_out',
        recordedAt: `${day}T${outH}:${outM}:00.000Z`,
        latitude: 41.311081,
        longitude: 69.240562,
        status: 'approved',
        deviceInfo: `FaceID terminal (${TAG})`,
      });
      await sleep(60); // rate-limit oldini olish uchun yumshoq pauza
    }
  }

  // 2) OYLIKLAR — har xodimga bir necha oylik to'lov (to'langan)
  if (process.env.SKIP_PAYMENTS) {
    console.log('▶ Oyliklar: SKIP_PAYMENTS o\'rnatilgan — o\'tkazib yuborildi.');
  } else {
    console.log('▶ Oyliklar (hr/payments)...');
    const salaryMonths = ['2026-04-30', '2026-05-31', '2026-06-30'];
    for (const s of staff) {
      for (const date of salaryMonths) {
        await tryCreate('payments', '/hr/payments', {
          staffMemberId: s.id,
          amount: s.salary,
          paymentDate: date,
          status: 'paid',
          note: `Oylik ish haqi (${date.slice(0, 7)}) — ${TAG}`,
        });
        await sleep(60);
      }
    }
  }

  console.log('\n════════ NATIJA ════════');
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(16)}: ${v}`);
  console.log('════════════════════════');
}

main().catch((e) => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
