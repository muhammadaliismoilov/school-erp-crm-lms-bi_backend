// Elegant School va Uno'ni Yuton School darajasiga yaqinlashtirish: o'quvchi
// sonini maqsadga yetkazish (Elegant=200, Uno=150), har biriga to'lov va har
// maktabga 300 tadan CRM lid qo'shish. O'chirmaydi, faqat qo'shadi.
// Ishga tushirish: node scripts/seed-elegant-uno-scale.mjs
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

const SCHOOLS = [
  // Elegant School: birinchi (yarim muvaffaqiyatli) urinishda 104 ta lid
  // allaqachon qo'shilgan edi — qolganini to'ldiramiz (jami 300 bo'lsin).
  { id: 'f7ed51a1-63a5-4d98-9472-f4aad4f96626', label: 'Elegant School', targetStudents: 200, leads: 196 },
  { id: '181167f2-0d4a-4fb9-8eb3-d553ce3d60ef', label: 'Uno', targetStudents: 150, leads: 300 },
];

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
    const det = JSON.stringify(json?.error?.details || json?.error || '').slice(0, 200);
    throw new Error(`${method} ${path} -> ${res.status} ${msg} ${det}`);
  }
  return json.data ?? json;
}

async function tryCreate(label, path, body) {
  try {
    const d = await api('POST', path, body);
    bump(label);
    return d;
  } catch (e) {
    bump(`${label}_error`);
    if ((stats[`${label}_error`] || 0) <= 3) console.warn(`  ⚠︎ ${label}: ${e.message}`);
    return null;
  }
}

// Bir vaqtda ko'pi bilan `n` ta parallel — DB connection pool (10)dan oshmasin.
async function mapLimit(items, n, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (n, w = 3) => String(n).padStart(w, '0');
// Haqiqiy O'zbekiston mobil operator prefikslari — libphonenumber-js
// (`@IsPhoneNumber('UZ')`) tasodifiy prefiksларning barchasini qabul
// qilavermaydi, shuning uchun faqat tan olinganlaridan foydalanamiz.
const UZ_PREFIXES = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88', '20'];
const phone = () => `+998${rand(UZ_PREFIXES)}${pad(Math.floor(Math.random() * 9999999), 7)}`;

const firstM = ['Ali', 'Sardor', 'Jasur', 'Bexruz', 'Doston', 'Umar', 'Sherzod', 'Diyor', 'Anvar', 'Farrux', 'Islom', 'Nodir'];
const firstF = ['Sevara', 'Madina', 'Nilufar', 'Sarvara', 'Gulnoza', 'Dildora', 'Zarina', 'Kamila', 'Malika', 'Feruza', 'Shahnoza', 'Ozoda'];
const lasts = ['Valiyev', 'Karimov', 'Tosheva', 'Ergasheva', 'Sobirov', 'Yusupova', 'Rahimov', 'Ismoilova', 'Nazarov', 'Saidova', 'Aliyev', 'Xolmatova', 'Mirzayev', 'Qodirova'];
const districts = ['Yunusobod', 'Chilonzor', "Mirzo Ulug'bek", 'Yakkasaroy', 'Shayxontohur', 'Sergeli'];

async function ensureClasses(schoolId, academicYearId, roomIds, curatorIds) {
  const existing = await api('GET', '/academic/classes?limit=100');
  const items = existing?.items ?? [];
  if (items.length >= 8) return items.map((c) => c.id);

  const extraDefs = [
    { gradeLevel: 3, section: 'A', language: 'uz' },
    { gradeLevel: 4, section: 'A', language: 'uz' },
    { gradeLevel: 6, section: 'A', language: 'uz' },
    { gradeLevel: 7, section: 'A', language: 'ru' },
    { gradeLevel: 8, section: 'A', language: 'uz' },
    { gradeLevel: 10, section: 'A', language: 'uz' },
    { gradeLevel: 11, section: 'A', language: 'uz' },
    { gradeLevel: 3, section: 'B', language: 'ru' },
  ];
  const classIds = items.map((c) => c.id);
  for (let i = 0; i < extraDefs.length; i++) {
    const d = extraDefs[i];
    const created = await tryCreate('classes', '/academic/classes', {
      gradeLevel: d.gradeLevel,
      section: d.section,
      language: d.language,
      roomId: roomIds[i % roomIds.length],
      curatorId: curatorIds[i % curatorIds.length],
      academicYearId,
      capacity: 30,
    });
    if (created?.id) classIds.push(created.id);
  }
  return classIds;
}

async function seedSchool(school) {
  CURRENT_SCHOOL_ID = school.id;
  const TAG = (Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(-3)).toUpperCase();
  console.log(`\n======== ${school.label} (TAG=${TAG}) ========`);

  const yearsResp = await api('GET', '/academic/years');
  const year = (Array.isArray(yearsResp) ? yearsResp : yearsResp?.items ?? []).find((y) => y.isCurrent) ??
    (Array.isArray(yearsResp) ? yearsResp[0] : yearsResp?.items?.[0]);
  if (!year?.id) throw new Error(`${school.label}: o'quv yili topilmadi`);

  const roomsResp = await api('GET', '/settings/rooms');
  const roomIds = (roomsResp?.items ?? roomsResp ?? []).map((r) => r.id);

  const usersResp = await api('GET', '/users?limit=20');
  const curatorIds = (usersResp?.items ?? []).map((u) => u.id);
  if (!roomIds.length || !curatorIds.length) throw new Error(`${school.label}: xona/kurator topilmadi`);

  const classIds = await ensureClasses(school.id, year.id, roomIds, curatorIds);
  console.log(`  ✓ sinflar: ${classIds.length} ta`);

  // Hozirgi o'quvchilar soni
  const listResp = await api('GET', '/students?page=1&limit=1');
  const currentTotal = listResp?.meta?.total ?? 0;
  const toCreate = Math.max(0, school.targetStudents - currentTotal);
  console.log(`  Hozir: ${currentTotal}, kerak: +${toCreate} (maqsad ${school.targetStudents})`);

  const indices = Array.from({ length: toCreate }, (_, i) => i);
  const newStudents = await mapLimit(indices, 6, async (i) => {
    const male = i % 2 === 0;
    const fee = rand([1800000, 2050000, 2400000, 2800000, 3200000]);
    const st = await tryCreate('students', '/students', {
      firstName: male ? rand(firstM) : rand(firstF),
      lastName: rand(lasts),
      gender: male ? 'male' : 'female',
      birthDate: `20${10 + (i % 8)}-0${(i % 9) + 1}-1${i % 9}`,
      preferredLanguage: 'uz',
      studentCode: `ST-${TAG}-${pad(i + 1, 4)}`,
      status: 'active',
      monthlyFee: fee,
      discountType: 'percent',
      discountValue: rand([0, 0, 0, 10, 15, 25]),
      billingStartDate: '2026-09-01',
      paymentPlan: 'monthly',
      region: 'Toshkent',
      district: rand(districts),
      personalPhone: phone(),
      guardianFullName: `${rand(lasts)} ${rand(['Akmal', 'Botir', 'Shavkat', 'Dilshod', 'Rustam', 'Jahongir'])}`,
      guardianRelation: rand(['father', 'mother']),
      guardianPhone: phone(),
      currentClassId: classIds[i % classIds.length],
    });
    return st?.id ? { id: st.id, fee } : null;
  });
  const students = newStudents.filter(Boolean);
  console.log(`  ✓ o'quvchilar: +${students.length}`);

  // To'lovlar — har o'quvchiga 2-3 oy. KETMA-KET (concurrency=1): kvitansiya
  // raqami generatsiyasi (`nextReceiptNumber`) parallel so'rovlarda race
  // condition'ga uchraydi (bir xil raqamni ikkitasi tanlab, DB cheklovida
  // 500 bilan qulaydi) — bu alohida backend nosozligi, hozircha shu yerda
  // parallelsizlik bilan chetlab o'tiladi.
  const payTypes = Object.values(PAY);
  await mapLimit(students, 1, async (s) => {
    const months = [9, 10, 11].slice(0, 2 + Math.floor(Math.random() * 2));
    for (const m of months) {
      const full = Math.random() > 0.25;
      await tryCreate('payments', '/student-payments', {
        studentId: s.id,
        amount: full ? s.fee : Math.round(s.fee * 0.6),
        planAmount: s.fee,
        paymentTypeId: rand(payTypes),
        paymentDate: `2026-${pad(m, 2)}-05`,
        month: m,
        year: 2026,
        status: full ? 'paid' : 'partial',
        note: `${TAG} seed to'lovi`,
      });
    }
  });
  console.log(`  ✓ to'lovlar tugadi`);

  // Lidlar (CRM)
  const leadSources = ['Instagram', 'Telegram', "Do'stlar tavsiyasi", 'Veb-sayt', "Ko'cha reklama"];
  const leadStatuses = ['new', 'contacted', 'interested', 'trial_lesson', 'contract', 'rejected'];
  const leadIdx = Array.from({ length: school.leads }, (_, i) => i);
  await mapLimit(leadIdx, 6, async (i) => {
    const male = i % 2 === 0;
    await tryCreate('leads', '/crm/leads', {
      firstName: male ? rand(firstM) : rand(firstF),
      lastName: rand(lasts),
      phone: phone(),
      status: rand(leadStatuses),
      notes: `${rand(leadSources)} orqali murojaat qildi (${TAG})`,
    });
  });
  console.log(`  ✓ lidlar: +${school.leads}`);
}

async function main() {
  const auth = await api('POST', '/auth/login', { login: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK (${env.ADMIN_USERNAME})`);

  for (const school of SCHOOLS) {
    await seedSchool(school);
  }

  console.log('\n════════ NATIJA ════════');
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(16)}: ${v}`);
  console.log('═════════════════════════');
}

main().catch((e) => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
