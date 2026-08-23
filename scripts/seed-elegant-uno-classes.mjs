// Elegant School va Uno uchun avvalgi seed (seed-elegant-uno-via-api.mjs)
// o'quv yili yaratishda global (tenant-scopsiz) sana-to'qnashuv tekshiruvi
// tufayli 409 bilan to'xtagan edi (shu bug ham tuzatildi). Bu skript faqat
// qolgan qismni — o'quv yili va sinflarni — allaqachon yaratilgan xona va
// foydalanuvchilardan foydalanib to'ldiradi. O'quvchilarni sinflarga
// biriktirish uchun mos API yo'q (faqat "sinfdan sinfga ko'chirish" bor,
// "sinfsizdan sinfga" emas) — shuning uchun oxirida to'g'ridan-to'g'ri SQL
// bilan bog'lanadi (destruktiv emas: faqat bo'sh current_class_id to'ldiriladi).
import { readFileSync } from 'node:fs';

const BASE = process.env.SEED_BASE || 'http://localhost:5000/api/v1';
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const SCHOOLS = [
  {
    id: 'f7ed51a1-63a5-4d98-9472-f4aad4f96626',
    label: 'Elegant School',
    rooms: ['b4fb6f47-960a-4d07-8e3a-4d4ef4045aea', 'cbb25585-cf7a-4d1a-8426-0667c9fd2975', 'f20d86fa-be09-4f6a-9cf2-f95244e12507', '2d5b29e4-932a-419c-aaa8-7236a43a7912'],
    curators: ['d13a4de9-7a9e-46cc-b7ea-a5e38c9e4855', '9c803016-d568-4a5e-ba7a-c2e232b6dead', 'b951a608-91a6-4255-b830-2caaab25e3bc', '6b554f89-d4f1-40d1-8006-5850d22449a6'],
  },
  {
    id: '181167f2-0d4a-4fb9-8eb3-d553ce3d60ef',
    label: 'Uno',
    rooms: ['c9dd82e7-c007-4cac-8f9d-df910abe334b', 'e2c55a5f-b598-4f70-8de2-0b52a53923af', '63912e57-cf80-47b8-9a5c-e1a40fc22aa7', 'a68faa3d-7ed9-431a-aaed-5f8805c3f1ac'],
    curators: ['7f4246fd-7538-4d52-8850-d4e2a72e2de5', 'c0f50776-e0b5-4d38-a77f-ce6b6dc915de', 'ebd16fd0-a5ce-4449-8141-b84a1f5159ff', '86e0c0b0-b557-487c-8afb-5b368c105616'],
  },
];

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
  if (!res.ok || json.success === false) {
    const msg = json?.error?.message || json?.message || res.statusText;
    const det = JSON.stringify(json?.error?.details || json?.error || '').slice(0, 300);
    throw new Error(`${method} ${path} -> ${res.status} ${msg} ${det}`);
  }
  return json.data ?? json;
}

async function main() {
  const auth = await api('POST', '/auth/login', { login: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK (${env.ADMIN_USERNAME})`);

  for (const school of SCHOOLS) {
    CURRENT_SCHOOL_ID = school.id;
    const TAG = Math.random().toString(36).slice(-5).toUpperCase();
    console.log(`\n======== ${school.label} ========`);

    const year = await api('POST', '/academic/years', {
      name: `2026-2027 ${TAG}`,
      startDate: '2026-09-01',
      endDate: '2027-05-31',
      isCurrent: true,
    });
    console.log(`  ✓ o'quv yili: ${year.name} (${year.id})`);

    const classDefs = [
      { gradeLevel: 1, section: 'A', language: 'uz' },
      { gradeLevel: 2, section: 'A', language: 'uz' },
      { gradeLevel: 5, section: 'B', language: 'ru' },
      { gradeLevel: 9, section: 'A', language: 'uz' },
    ];
    const classIds = [];
    for (let i = 0; i < classDefs.length; i++) {
      const c = classDefs[i];
      const created = await api('POST', '/academic/classes', {
        gradeLevel: c.gradeLevel,
        section: c.section,
        language: c.language,
        roomId: school.rooms[i % school.rooms.length],
        curatorId: school.curators[i % school.curators.length],
        academicYearId: year.id,
        capacity: 30,
      });
      classIds.push(created.id);
      console.log(`  ✓ sinf: ${created.name} (${created.id})`);
    }

    console.log(`  CLASS_IDS_FOR_SQL[${school.label}] = ${classIds.join(',')}`);
  }
}

main().catch((e) => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
