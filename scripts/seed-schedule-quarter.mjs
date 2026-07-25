// Butun chorak bo'ylab dars jadvalini taqsimlash (autogenerate orqali, DB'ga yozadi).
// Darslar chorakning har haftasiga sanali tarzda materializatsiya qilinadi.
// Ishga tushirish:  node scripts/seed-schedule-quarter.mjs
//   QUARTER=1 node scripts/seed-schedule-quarter.mjs   (chorak raqamini tanlash, default 1)
import { readFileSync } from 'node:fs';

const BASE = process.env.SEED_BASE || 'http://localhost:5000/api/v1';
const YUTON_SCHOOL_ID = '2ca28a71-78f7-44a0-9a23-852c041a28ea';
const QUARTER_NUMBER = Number(process.env.QUARTER || 1);

// Sinf turi bo'yicha soat taqsimoti (kamayuvchi tartibda fanlarga beriladi).
const PRIMARY_HOURS = [5, 5, 4, 3, 3, 2, 2, 2]; // ~26 soat/hafta
const HIGH_HOURS = [5, 5, 4, 4, 3, 3, 2, 2, 2, 2]; // ~32 soat/hafta
const MAX_PER_DAY = 7;
const MAX_PER_SUBJECT_PER_DAY = 2;
const DAYS = [1, 2, 3, 4, 5];

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

let TOKEN = '';
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
    const det = JSON.stringify(json?.error?.messages || json?.error?.details || '').slice(0, 300);
    throw new Error(`${method} ${path} -> ${res.status} ${msg} ${det}`);
  }
  return json.data ?? json;
}

async function main() {
  // 1) Login
  const auth = await api('POST', '/auth/login', {
    login: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK (${env.ADMIN_USERNAME})`);

  // 2) Chorakni tanlash
  const quarters = (await api('GET', '/academic/quarters')).items ?? [];
  const quarter = quarters.find((q) => q.quarterNumber === QUARTER_NUMBER) ?? quarters[0];
  if (!quarter) throw new Error('Chorak topilmadi');
  console.log(`✓ Chorak: ${quarter.quarterNumber}-chorak (${quarter.startDate}..${quarter.endDate})`);

  // 3) Ma'lumotlar
  const cls = await api('GET', `/lms/lessons/classes?quarterId=${quarter.id}`);
  const classes = [...(cls.primary ?? []), ...(cls.high ?? [])];
  const primaryIds = new Set((cls.primary ?? []).map((c) => c.id));
  const subjects = (await api('GET', '/academic/subjects')).items ?? [];
  const teachers = (await api('GET', '/lms/lessons/teachers')).items ?? [];
  const rooms = (await api('GET', '/settings/rooms')).items ?? [];
  console.log(
    `✓ Sinf=${classes.length} Fan=${subjects.length} O'qituvchi=${teachers.length} Xona=${rooms.length}`,
  );
  if (!classes.length || !subjects.length || !teachers.length) {
    throw new Error('Sinf/fan/o\'qituvchi yetarli emas — avval ularni seed qiling.');
  }

  // 4) Taqsimot: har sinfga fanlar, har fanga o'qituvchi (global rotatsiya) va xona (sinfga biriktirilgan).
  let teacherCursor = 0;
  const nextTeacher = () => teachers[teacherCursor++ % teachers.length].id;

  const distribution = [];
  classes.forEach((c, ci) => {
    const isPrimary = primaryIds.has(c.id);
    const hours = isPrimary ? PRIMARY_HOURS : HIGH_HOURS;
    // Fanlar oynasini sinf bo'yicha aylantirib olamiz (xilma-xillik uchun).
    const homeRoom = rooms.length ? rooms[ci % rooms.length].id : undefined;
    for (let i = 0; i < hours.length; i++) {
      const subject = subjects[(ci + i) % subjects.length];
      distribution.push({
        classId: c.id,
        subjectId: subject.id,
        teacherId: nextTeacher(),
        ...(homeRoom ? { roomId: homeRoom } : {}),
        hoursPerWeek: hours[i],
      });
    }
  });

  console.log(`▶ Taqsimot tayyorlandi: ${distribution.length} yozuv. Generatsiya...`);

  // 5) Avtogeneratsiya — butun chorak bo'ylab sanali darslar yaratiladi.
  const result = await api('POST', '/lms/lessons/generate', {
    quarterId: quarter.id,
    mode: 'add',
    days: DAYS,
    maxPerDay: MAX_PER_DAY,
    maxPerSubjectPerDay: MAX_PER_SUBJECT_PER_DAY,
    distribution,
  });

  console.log('\n════════ NATIJA ════════');
  console.log(`  Yaratildi : ${result.created ?? 0}`);
  console.log(`  Yangilandi: ${result.updated ?? 0}`);
  console.log(`  O'tkazildi: ${result.skipped ?? 0}`);
  console.log('════════════════════════');
  console.log('Endi UI: Academic → Dars jadvali → Chorak/Oy ko\'rinishida tekshiring.');
}

main().catch((e) => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
