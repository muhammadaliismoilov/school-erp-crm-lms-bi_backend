// Lidlarni har maktabda aniq 300 taga yetkazish (endi to'g'ri scoped API).
import { readFileSync } from 'node:fs';

const BASE = process.env.SEED_BASE || 'http://localhost:5000/api/v1';
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const SCHOOLS = {
  'f7ed51a1-63a5-4d98-9472-f4aad4f96626': 'Elegant School',
  '181167f2-0d4a-4fb9-8eb3-d553ce3d60ef': 'Uno',
};
const TARGET = 300;

let TOKEN = '';
let CURRENT_SCHOOL_ID = '';

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
  if (!res.ok || json.success === false) throw new Error(`${method} ${path} -> ${res.status} ${json?.error?.message}`);
  return json.data ?? json;
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

  for (const [schoolId, label] of Object.entries(SCHOOLS)) {
    CURRENT_SCHOOL_ID = schoolId;
    const resp = await api('GET', '/crm/leads?page=1&limit=1');
    const current = resp?.meta?.total ?? 0;
    const need = Math.max(0, TARGET - current);
    console.log(`${label}: hozir=${current}, kerak=+${need}`);
    let ok = 0;
    for (let i = 0; i < need; i++) {
      const male = i % 2 === 0;
      try {
        await api('POST', '/crm/leads', {
          firstName: male ? rand(firstM) : rand(firstF),
          lastName: rand(lasts),
          phone: phone(),
          status: rand(['new', 'contacted', 'interested', 'trial_lesson', 'contract', 'rejected']),
          notes: 'final topup',
        });
        ok++;
      } catch (e) {
        console.warn(`  ⚠︎ ${e.message}`);
      }
    }
    console.log(`  ✓ +${ok}`);
  }
}

main().catch((e) => {
  console.error('✗ FATAL:', e.message);
  process.exit(1);
});
