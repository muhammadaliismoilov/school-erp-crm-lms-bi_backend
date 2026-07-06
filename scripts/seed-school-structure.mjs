// Maktab strukturasi seed: 450 o'quvchi (mavjud + yangi), ota-onalar, 18 sinf
// (boshlang'ich 200 + yuqori 250), fanlar, dars jadvali, fan o'qituvchilarini
// sinflarga biriktirish. O'chirmaydi, faqat qo'shadi.
// Ishga tushirish: node scripts/seed-school-structure.mjs
import { readFileSync } from 'node:fs';

const BASE = process.env.SEED_BASE || 'http://localhost:5000/api/v1';
const YUTON_SCHOOL_ID = '2ca28a71-78f7-44a0-9a23-852c041a28ea';
const TAG = Date.now().toString(36).slice(-5).toUpperCase();
const TARGET_TOTAL = 450;
const CLASS_SIZE = 25;

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

let TOKEN = '';
const stats = {};
const bump = (k, n = 1) => (stats[k] = (stats[k] || 0) + n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 429-ga chidamli API chaqiruv (har chaqiruv orasida kichik pauza).
async function api(method, path, body, attempt = 0) {
  await sleep(30);
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}`, 'X-School-Id': YUTON_SCHOOL_ID } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt < 6) {
    await sleep(1200 * (attempt + 1));
    return api(method, path, body, attempt + 1);
  }
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
    console.warn(`  ⚠︎ ${label}: ${e.message.slice(0, 130)}`);
    return null;
  }
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (n, w = 2) => String(n).padStart(w, '0');
const phone = () => `+9989${pad(Math.floor(10000000 + Math.random() * 89999999), 8)}`;

const FIRST_M = ['Ali', 'Sardor', 'Jasur', 'Bexruz', 'Doston', 'Umar', 'Islom', 'Timur', 'Amir', 'Bilol', 'Aziz', 'Kamron', 'Sanjar', 'Otabek', 'Shohruh', 'Firdavs', 'Ibrohim', 'Yusuf', 'Muhammadali', 'Abdulaziz'];
const FIRST_F = ['Sevara', 'Madina', 'Nilufar', 'Sarvara', 'Gulnoza', 'Dildora', 'Zilola', 'Mohira', 'Rayhona', 'Osiyo', 'Muslima', 'Soliha', 'Iroda', 'Shahzoda', 'Ezoza', 'Durdona', 'Samira', 'Xadicha', 'Omina', 'Marjona'];
const LASTS = ['Valiyev', 'Karimov', 'Toshev', 'Ergashev', 'Sobirov', 'Yusupov', 'Rahimov', 'Ismoilov', 'Nazarov', 'Saidov', 'Mirzayev', 'Qodirov', 'Abdullayev', 'Xolmatov', 'Umarov', 'Bekchanov', 'Ollaberganov', 'Matyoqubov'];
const DAD = ['Akmal', 'Botir', 'Shavkat', 'Dilshod', 'Olim', 'Rustam', 'G\'ayrat', 'Zokir'];
const MOM = ['Nodira', 'Gulchehra', 'Feruza', 'Dilfuza', 'Zulayho', 'Mavluda'];

// Fanlar (rang bilan) — boshlang'ich/yuqori taqsimoti quyida.
const SUBJECT_DEFS = [
  ['Matematika', 'Математика', '#2563EB'], ['Ona tili', 'Родной язык', '#16A34A'],
  ['Adabiyot', 'Литература', '#65A30D'], ['Ingliz tili', 'Английский язык', '#DC2626'],
  ['Rus tili', 'Русский язык', '#7C3AED'], ['Fizika', 'Физика', '#0891B2'],
  ['Kimyo', 'Химия', '#EA580C'], ['Biologiya', 'Биология', '#059669'],
  ['Tarix', 'История', '#B45309'], ['Geografiya', 'География', '#0D9488'],
  ['Informatika', 'Информатика', '#4F46E5'], ['Jismoniy tarbiya', 'Физкультура', '#DB2777'],
  ['Tasviriy san\'at', 'ИЗО', '#9333EA'], ['Musiqa', 'Музыка', '#C026D3'],
  ['Tabiiy fanlar', 'Естествознание', '#10B981'],
];

// Sinf rejasi: boshlang'ich (1-4) 8 sinf = 200, yuqori (5-11) 10 sinf = 250.
const CLASS_PLAN = [
  [1, 'A'], [1, 'B'], [2, 'A'], [2, 'B'], [3, 'A'], [3, 'B'], [4, 'A'], [4, 'B'],
  [5, 'A'], [5, 'B'], [6, 'A'], [6, 'B'], [7, 'A'], [7, 'B'], [8, 'A'], [9, 'A'], [10, 'A'], [11, 'A'],
];

// Haftalik dars rejasi (fan nomlari) — daraja bo'yicha.
function weeklyPlan(grade) {
  if (grade <= 4) {
    return ['Matematika', 'Matematika', 'Matematika', 'Matematika', 'Ona tili', 'Ona tili', 'Ona tili', 'Ona tili',
      'Ingliz tili', 'Ingliz tili', 'Tabiiy fanlar', 'Tabiiy fanlar', 'Jismoniy tarbiya', 'Jismoniy tarbiya',
      'Tasviriy san\'at', 'Musiqa', 'Adabiyot', 'Adabiyot', 'Informatika', 'Rus tili'];
  }
  return ['Matematika', 'Matematika', 'Matematika', 'Matematika', 'Ona tili', 'Ona tili', 'Adabiyot', 'Adabiyot',
    'Ingliz tili', 'Ingliz tili', 'Ingliz tili', 'Rus tili', 'Rus tili', 'Fizika', 'Fizika', 'Kimyo', 'Kimyo',
    'Biologiya', 'Biologiya', 'Tarix', 'Tarix', 'Geografiya', 'Informatika', 'Informatika',
    'Jismoniy tarbiya', 'Jismoniy tarbiya', 'Musiqa', 'Tabiiy fanlar', 'Tasviriy san\'at', 'Geografiya'];
}

async function main() {
  const auth = await api('POST', '/auth/login', { login: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD });
  TOKEN = auth.accessToken ?? auth.data?.accessToken;
  console.log(`✓ Login OK, TAG=${TAG}\n`);

  // ── 0) Lookuplar ──────────────────────────────────────────────────────────
  let years = await api('GET', '/academic/years').catch(() => []);
  if (years?.items) years = years.items;
  let year = (years ?? []).find((y) => y.isActive || y.isCurrent) ?? (years ?? [])[0];
  if (!year) {
    year = await tryCreate('o\'quv yili', '/academic/years', {
      name: '2026-2027', startDate: '2026-09-01', endDate: '2027-05-31', isActive: true,
    });
  }
  console.log(`▶ O'quv yili: ${year?.name ?? year?.id}`);

  let rooms = await api('GET', '/settings/rooms').catch(() => []);
  if (rooms?.items) rooms = rooms.items;
  rooms = rooms ?? [];
  for (let i = rooms.length; i < CLASS_PLAN.length; i++) {
    const r = await tryCreate('xona', '/settings/rooms', {
      name: `${TAG}-${pad(i + 1)}-xona`, floor: 1 + (i % 3), capacity: 30,
    });
    if (r) rooms.push(r);
  }
  console.log(`▶ Xonalar: ${rooms.length}`);

  let periods = await api('GET', '/lesson-periods').catch(() => []);
  if (periods?.items) periods = periods.items;
  periods = (periods ?? []).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const FALLBACK_PERIODS = [
    ['08:00', '08:45'], ['08:55', '09:40'], ['09:50', '10:35'], ['10:55', '11:40'], ['11:50', '12:35'], ['12:45', '13:30'],
  ].map(([startTime, endTime]) => ({ startTime, endTime }));
  const times = periods.length >= 5 ? periods : FALLBACK_PERIODS;
  console.log(`▶ Dars soatlari: ${times.length} ta (${periods.length >= 5 ? 'mavjud' : 'standart'})`);

  const teachers = (await api('GET', '/hr/teachers?limit=100')).items ?? [];
  console.log(`▶ O'qituvchilar: ${teachers.length}`);
  if (teachers.length === 0) throw new Error("O'qituvchi yo'q — avval HR seed kerak");

  // Kurator (sinf rahbari useri) uchun: o'qituvchi-xodimlarning userId'lari.
  const staff = (await api('GET', '/hr/staff?limit=100')).items ?? [];
  const curatorUserIds = staff.filter((s) => s.teacher && s.userId).map((s) => s.userId);
  const anyUserIds = staff.filter((s) => s.userId).map((s) => s.userId);
  const curators = curatorUserIds.length > 0 ? curatorUserIds : anyUserIds;
  console.log(`▶ Kurator nomzodlari: ${curators.length}`);

  // ── 1) Fanlar ─────────────────────────────────────────────────────────────
  console.log('\n▶ Fanlar...');
  let existingSubjects = await api('GET', '/academic/subjects?limit=100').catch(() => []);
  if (existingSubjects?.items) existingSubjects = existingSubjects.items;
  const subByName = new Map((existingSubjects ?? []).map((s) => [s.name?.toLowerCase(), s]));
  for (const [name, russianName, color] of SUBJECT_DEFS) {
    if (subByName.has(name.toLowerCase())) continue;
    const s = await tryCreate('fan', '/academic/subjects', { name, russianName, color });
    if (s) subByName.set(name.toLowerCase(), s);
  }
  // 409 bo'lganlar (allaqachon mavjud) — ro'yxatni qayta o'qib xaritaga qo'shamiz.
  let refreshed = await api('GET', '/academic/subjects?limit=100').catch(() => []);
  if (refreshed?.items) refreshed = refreshed.items;
  for (const sub of refreshed ?? []) subByName.set(sub.name?.toLowerCase(), sub);
  console.log(`  jami fan: ${subByName.size}`);

  // Fan → o'qituvchilar (round-robin taqsimot; har fanga 1-2 o'qituvchi).
  const subjectTeachers = new Map();
  SUBJECT_DEFS.forEach(([name], i) => {
    subjectTeachers.set(name, [teachers[i % teachers.length].id, teachers[(i + 7) % teachers.length].id]);
  });

  // ── 2) Sinflar ────────────────────────────────────────────────────────────
  console.log('\n▶ Sinflar (18 ta: 1-4 boshlang\'ich, 5-11 yuqori)...');
  let existingClasses = await api('GET', '/academic/classes?limit=100').catch(() => []);
  if (existingClasses?.items) existingClasses = existingClasses.items;
  const classKey = (g, s) => `${g}-${s}`;
  const classByKey = new Map((existingClasses ?? []).map((c) => [classKey(c.gradeLevel, c.section), c]));
  const classes = [];
  for (let i = 0; i < CLASS_PLAN.length; i++) {
    const [gradeLevel, section] = CLASS_PLAN[i];
    let cls = classByKey.get(classKey(gradeLevel, section));
    if (!cls) {
      cls = await tryCreate('sinf', '/academic/classes', {
        gradeLevel, section, language: 'uz',
        roomId: rooms[i % rooms.length].id,
        curatorId: curators[i % curators.length],
        academicYearId: year.id,
        capacity: 30,
      });
    }
    if (cls) classes.push({ ...cls, gradeLevel, section });
  }
  console.log(`  jami sinf: ${classes.length}`);

  // ── 3) O'quvchilar: mavjudlarni sinflarga, yetmaganini yaratish ───────────
  console.log('\n▶ O\'quvchilar...');
  const existing = [];
  for (let page = 1; page <= 10; page++) {
    const res = await api('GET', `/students?page=${page}&limit=100`);
    existing.push(...(res.items ?? []));
    if ((res.items ?? []).length < 100) break;
  }
  console.log(`  mavjud: ${existing.length} ta`);

  // Sinf kvotalari: har sinfga 25 tadan.
  const quota = classes.map((c) => ({ cls: c, need: CLASS_SIZE, members: [] }));

  // Mavjudlarni (sinfsizlarni) taqsimlaymiz — tug'ilgan yiliga qarab mos darajaga.
  const gradeFor = (birthDate) => {
    const y = Number(String(birthDate ?? '2015').slice(0, 4)) || 2015;
    return Math.min(11, Math.max(1, 2026 - y - 6)); // 7 yosh ≈ 1-sinf
  };
  for (const st of existing) {
    if (st.currentClassId) {
      const q = quota.find((q) => q.cls.id === st.currentClassId);
      if (q) { q.need -= 1; q.members.push(st.id); }
      continue;
    }
    const g = gradeFor(st.birthDate);
    const q = quota.filter((q) => q.need > 0).sort((a, b) =>
      Math.abs(a.cls.gradeLevel - g) - Math.abs(b.cls.gradeLevel - g))[0];
    if (!q) continue;
    try {
      await api('PATCH', `/students/${st.id}`, { currentClassId: q.cls.id });
      q.need -= 1; q.members.push(st.id);
      bump('mavjud→sinf');
    } catch (e) { console.warn(`  ⚠︎ patch: ${e.message.slice(0, 90)}`); }
  }

  // Yangi o'quvchilar — kvotalarni to'ldirish (jami 450 gacha).
  const toCreate = Math.max(0, TARGET_TOTAL - existing.length);
  console.log(`  yaratiladi: ${toCreate} ta yangi`);
  let created = 0;
  let lastParent = null;
  for (const q of quota) {
    while (q.need > 0 && created < toCreate) {
      const male = Math.random() < 0.5;
      const firstName = male ? rand(FIRST_M) : rand(FIRST_F);
      const surname = rand(LASTS);
      const lastName = male ? surname : surname + 'a';
      const birthYear = 2026 - 6 - q.cls.gradeLevel;
      const st = await tryCreate('o\'quvchi', '/students', {
        firstName, lastName, gender: male ? 'male' : 'female',
        birthDate: `${birthYear}-${pad(1 + Math.floor(Math.random() * 12))}-${pad(1 + Math.floor(Math.random() * 27))}`,
        preferredLanguage: 'uz',
        studentCode: `ST-${TAG}-${pad(created + 1, 4)}`,
        status: 'active',
        currentClassId: q.cls.id,
        monthlyFee: rand([1800000, 2050000, 2400000, 2800000]),
        discountType: 'percent', discountValue: rand([0, 0, 0, 10, 15]),
        billingStartDate: '2026-09-01', paymentPlan: 'monthly',
        region: 'Xorazm', district: rand(['Gurlan', 'Yangibozor', 'Urganch', 'Xiva']),
        guardianFullName: `${surname} ${rand(DAD)}`, guardianRelation: 'father', guardianPhone: phone(),
      });
      if (!st) { created++; continue; } // xato bo'lsa ham cheksiz siklga tushmaslik
      q.need -= 1; q.members.push(st.id);
      created++;

      // Ota-ona: 80% yangi ota-ona, 20% oldingi bilan aka-uka (bir oila).
      if (lastParent && Math.random() < 0.2 && lastParent.surname === surname) {
        await tryCreate('farzand-bog\'', `/students/${st.id}/parents`, {
          parentId: lastParent.id, relation: lastParent.relation,
        });
      } else {
        const isFather = Math.random() < 0.6;
        const parent = await tryCreate('ota-ona', '/students/parents', {
          firstName: isFather ? rand(DAD) : rand(MOM),
          lastName: isFather ? surname : surname + 'a',
          phone: phone(),
        });
        if (parent) {
          const relation = isFather ? 'father' : 'mother';
          await tryCreate('farzand-bog\'', `/students/${st.id}/parents`, { parentId: parent.id, relation });
          lastParent = { id: parent.id, surname, relation };
        }
      }
      if (created % 50 === 0) console.log(`  ${created}/${toCreate}...`);
    }
  }

  // ── 4) Dars jadvali ───────────────────────────────────────────────────────
  console.log('\n▶ Dars jadvali...');
  const template = await tryCreate('shablon', '/timetable/templates', {
    name: `Asosiy jadval ${year?.name ?? ''} [${TAG}]`,
    academicYearId: year?.id, isActive: true,
  });
  if (template) {
    // Har sinf uchun: hafta reja fanlarini kunlarga taqsimlaymiz.
    for (const c of classes) {
      const plan = weeklyPlan(c.gradeLevel);
      const perDay = c.gradeLevel <= 4 ? 4 : 5;
      let idx = 0;
      // Har sinf-fan uchun BITTA o'qituvchi tanlaymiz (biriktirish barqaror bo'lsin).
      const classSubjectTeacher = new Map();
      for (let weekday = 1; weekday <= 6 && idx < plan.length; weekday++) {
        for (let lesson = 0; lesson < perDay && idx < plan.length; lesson++) {
          const subjectName = plan[idx];
          idx += 1;
          const subject = subByName.get(subjectName.toLowerCase());
          if (!subject) continue;
          if (!classSubjectTeacher.has(subjectName)) {
            const pool = subjectTeachers.get(subjectName) ?? [teachers[0].id];
            classSubjectTeacher.set(subjectName, pool[(c.gradeLevel + lesson) % pool.length]);
          }
          const t = times[lesson] ?? times[times.length - 1];
          await tryCreate('slot', '/timetable/slots', {
            templateId: template.id,
            classId: c.id,
            subjectId: subject.id,
            teacherId: classSubjectTeacher.get(subjectName),
            roomId: rooms[classes.indexOf(c) % rooms.length].id,
            weekday,
            startTime: String(t.startTime).slice(0, 5),
            endTime: String(t.endTime).slice(0, 5),
          });
        }
      }
      console.log(`  ${c.gradeLevel}-${c.section} jadvali tayyor`);
    }
  }

  console.log('\n════════ NATIJA ════════');
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(16)}: +${v}`);
  const finalCount = (await api('GET', '/students?page=1&limit=1')).meta?.total;
  console.log(`\n  MAKTABDA JAMI O'QUVCHI: ${finalCount}`);
  console.log(`  Belgi: ${TAG}`);
}

main().catch((e) => { console.error('\n✗ FATAL:', e.message); process.exit(1); });
