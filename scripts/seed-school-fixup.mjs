// seed-school-structure to'ldiruvchisi: (1) dars jadvali slotlari (fanlar GET
// shakli tuzatildi, o'qituvchi vaqt konfliktida keyingisini tanlaydi),
// (2) o'quvchilarni 450 taga yetkazish. O'chirmaydi.
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:5000/api/v1';
const YUTON_SCHOOL_ID = '2ca28a71-78f7-44a0-9a23-852c041a28ea';
const TAG = 'FX' + Date.now().toString(36).slice(-4).toUpperCase();
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
    const err = new Error(`${method} ${path} -> ${res.status} ${msg}`);
    err.status = res.status;
    throw err;
  }
  return json.data ?? json;
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (n, w = 2) => String(n).padStart(w, '0');
let phoneSeq = Math.floor(Math.random() * 500);
const phone = () => `+99893${pad(1000000 + (phoneSeq++ * 7919) % 8999999, 7)}`;

const FIRST_M = ['Ali', 'Sardor', 'Jasur', 'Bexruz', 'Doston', 'Umar', 'Islom', 'Timur', 'Amir', 'Bilol'];
const FIRST_F = ['Sevara', 'Madina', 'Nilufar', 'Sarvara', 'Gulnoza', 'Dildora', 'Zilola', 'Mohira'];
const LASTS = ['Valiyev', 'Karimov', 'Toshev', 'Ergashev', 'Sobirov', 'Yusupov', 'Rahimov', 'Ismoilov'];
const DAD = ['Akmal', 'Botir', 'Shavkat', 'Dilshod', 'Olim'];
const MOM = ['Nodira', 'Gulchehra', 'Feruza', 'Dilfuza'];

function weeklyPlan(grade) {
  if (grade <= 4) {
    return ['Matematika', 'Matematika', 'Matematika', 'Matematika', 'Ona tili', 'Ona tili', 'Ona tili', 'Ona tili',
      'Ingliz tili', 'Ingliz tili', 'Tabiiy fanlar', 'Tabiiy fanlar', 'Jismoniy tarbiya', 'Jismoniy tarbiya',
      "Tasviriy san'at", 'Musiqa', 'Adabiyot', 'Adabiyot', 'Informatika', 'Rus tili'];
  }
  return ['Matematika', 'Matematika', 'Matematika', 'Matematika', 'Ona tili', 'Ona tili', 'Adabiyot', 'Adabiyot',
    'Ingliz tili', 'Ingliz tili', 'Ingliz tili', 'Rus tili', 'Rus tili', 'Fizika', 'Fizika', 'Kimyo', 'Kimyo',
    'Biologiya', 'Biologiya', 'Tarix', 'Tarix', 'Geografiya', 'Informatika', 'Informatika',
    'Jismoniy tarbiya', 'Jismoniy tarbiya', 'Musiqa', 'Tabiiy fanlar', "Tasviriy san'at", 'Geografiya'];
}

const TIMES = [
  ['08:00', '08:45'], ['08:55', '09:40'], ['09:50', '10:35'], ['10:55', '11:40'], ['11:50', '12:35'], ['12:45', '13:30'],
];

async function main() {
  const auth = await api('POST', '/auth/login', { login: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK, TAG=${TAG}\n`);

  // Lookuplar (parametrsiz — limit query 400 beradi).
  const subsRes = await api('GET', '/academic/subjects');
  const subjects = subsRes.items ?? subsRes;
  const subByName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));
  console.log(`▶ Fanlar: ${subByName.size}`);

  let classesRes = await api('GET', '/academic/classes');
  let classes = classesRes.items ?? classesRes;
  classes = classes.filter((c) => c.gradeLevel >= 1 && c.gradeLevel <= 11);
  console.log(`▶ Sinflar: ${classes.length}`);

  const teachers = (await api('GET', '/hr/teachers?limit=100')).items ?? [];
  console.log(`▶ O'qituvchilar: ${teachers.length}`);

  let roomsRes = await api('GET', '/settings/rooms').catch(() => []);
  const rooms = roomsRes.items ?? roomsRes ?? [];

  // Shablon: oxirgi yaratilganini olamiz yoki yangi.
  let tmplRes = await api('GET', '/timetable/templates').catch(() => []);
  let templates = tmplRes.items ?? tmplRes ?? [];
  let template = templates.find((t) => String(t.name).includes('Asosiy jadval')) ?? templates[0];
  if (!template) {
    template = await api('POST', '/timetable/templates', { name: `Asosiy jadval [${TAG}]`, isActive: true });
  }
  console.log(`▶ Shablon: ${template.name}`);

  // Mavjud slotlar (dublikat oldini olish): classId+weekday+startTime kaliti.
  let slotsRes = await api('GET', '/timetable/slots').catch(() => []);
  const existingSlots = slotsRes.items ?? slotsRes ?? [];
  const slotKey = (c, w, st) => `${c}|${w}|${String(st).slice(0, 5)}`;
  const haveSlot = new Set(existingSlots.map((s) => slotKey(s.classId, s.weekday, s.startTime)));
  // O'qituvchi bandligi: teacherId|weekday|startTime.
  const teacherBusy = new Set(existingSlots.map((s) => `${s.teacherId}|${s.weekday}|${String(s.startTime).slice(0, 5)}`));
  console.log(`▶ Mavjud slotlar: ${existingSlots.length}\n`);

  // ── 1) Dars jadvali slotlari ──────────────────────────────────────────────
  console.log('▶ Jadval slotlari...');
  const sortedClasses = [...classes].sort((a, b) => a.gradeLevel - b.gradeLevel || String(a.section).localeCompare(b.section));
  for (const c of sortedClasses) {
    const plan = weeklyPlan(c.gradeLevel);
    const perDay = c.gradeLevel <= 4 ? 4 : 5;
    let idx = 0;
    const classTeacher = new Map(); // sinf ichida fan → o'qituvchi barqaror
    let made = 0;
    for (let weekday = 1; weekday <= 6 && idx < plan.length; weekday++) {
      for (let lesson = 0; lesson < perDay && idx < plan.length; lesson++) {
        const subjectName = plan[idx];
        idx += 1;
        const subject = subByName.get(subjectName.toLowerCase());
        if (!subject) { bump('fan-topilmadi'); continue; }
        const [startTime, endTime] = TIMES[lesson];
        if (haveSlot.has(slotKey(c.id, weekday, startTime))) continue;

        // Shu vaqtda BO'SH o'qituvchini tanlaymiz (fanga biriktirilgan bo'lsa afzal).
        const preferIdx = subjects.findIndex((s) => s.id === subject.id);
        const ordered = [...teachers.slice(preferIdx % teachers.length), ...teachers.slice(0, preferIdx % teachers.length)];
        const fixed = classTeacher.get(subjectName);
        const candidates = fixed
          ? [fixed, ...ordered.map((t) => t.id).filter((id) => id !== fixed)]
          : ordered.map((t) => t.id);
        const free = candidates.find((id) => !teacherBusy.has(`${id}|${weekday}|${startTime}`));
        if (!free) { bump('o\'qituvchi-band'); continue; }
        classTeacher.set(subjectName, free);

        try {
          await api('POST', '/timetable/slots', {
            templateId: template.id,
            classId: c.id,
            subjectId: subject.id,
            teacherId: free,
            ...(rooms.length ? { roomId: rooms[sortedClasses.indexOf(c) % rooms.length].id } : {}),
            weekday, startTime, endTime,
          });
          bump('slot');
          made += 1;
          teacherBusy.add(`${free}|${weekday}|${startTime}`);
          haveSlot.add(slotKey(c.id, weekday, startTime));
        } catch (e) {
          bump('slot-xato');
          if ((stats['slot-xato'] ?? 0) <= 3) console.warn(`  ⚠︎ slot: ${e.message.slice(0, 110)}`);
        }
      }
    }
    console.log(`  ${c.gradeLevel}-${c.section}: +${made} slot`);
  }

  // ── 2) O'quvchilarni 450 ga yetkazish ─────────────────────────────────────
  console.log("\n▶ O'quvchilar sonini to'ldirish...");
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const res = await api('GET', `/students?page=${page}&limit=100`);
    all.push(...(res.items ?? []));
    if ((res.items ?? []).length < 100) break;
  }
  const perClass = new Map(classes.map((c) => [c.id, 0]));
  for (const st of all) if (perClass.has(st.currentClassId)) perClass.set(st.currentClassId, perClass.get(st.currentClassId) + 1);

  let need = TARGET_TOTAL - all.length;
  console.log(`  hozir: ${all.length}, qo'shiladi: ${Math.max(0, need)}`);
  let i = 0;
  while (need > 0) {
    // Eng kam to'lgan sinfga qo'shamiz.
    const target = classes.filter((c) => (perClass.get(c.id) ?? 0) < CLASS_SIZE + 5)
      .sort((a, b) => (perClass.get(a.id) ?? 0) - (perClass.get(b.id) ?? 0))[0] ?? classes[0];
    const male = i % 2 === 0;
    const firstName = male ? rand(FIRST_M) : rand(FIRST_F);
    const surname = rand(LASTS);
    const birthYear = 2026 - 6 - target.gradeLevel;
    try {
      const st = await api('POST', '/students', {
        firstName, lastName: male ? surname : surname + 'a',
        gender: male ? 'male' : 'female',
        birthDate: `${birthYear}-${pad(1 + (i % 12))}-${pad(1 + (i % 27))}`,
        preferredLanguage: 'uz',
        studentCode: `ST-${TAG}-${pad(i + 1, 4)}`,
        status: 'active', currentClassId: target.id,
        monthlyFee: rand([1800000, 2050000, 2400000, 2800000]),
        billingStartDate: '2026-09-01', paymentPlan: 'monthly',
        region: 'Xorazm', district: rand(['Gurlan', 'Yangibozor']),
        guardianFullName: `${surname} ${rand(DAD)}`, guardianRelation: 'father', guardianPhone: phone(),
      });
      bump("o'quvchi");
      perClass.set(target.id, (perClass.get(target.id) ?? 0) + 1);
      need -= 1;

      const isFather = Math.random() < 0.6;
      const parent = await api('POST', '/students/parents', {
        firstName: isFather ? rand(DAD) : rand(MOM),
        lastName: isFather ? surname : surname + 'a',
        phone: phone(),
      }).catch(() => null);
      if (parent) {
        bump('ota-ona');
        await api('POST', `/students/${st.id}/parents`, { parentId: parent.id, relation: isFather ? 'father' : 'mother' })
          .then(() => bump('bog\'lanish')).catch(() => {});
      }
    } catch (e) {
      bump('o\'quvchi-xato');
      if ((stats['o\'quvchi-xato'] ?? 0) <= 3) console.warn(`  ⚠︎ ${e.message.slice(0, 110)}`);
      if ((stats['o\'quvchi-xato'] ?? 0) > 60) break;
    }
    i += 1;
  }

  console.log('\n════════ NATIJA ════════');
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(16)}: +${v}`);
  const total = (await api('GET', '/students?page=1&limit=1')).meta?.total;
  const slotsNow = await api('GET', '/timetable/slots').catch(() => []);
  console.log(`\n  JAMI O'QUVCHI: ${total}`);
  console.log(`  JAMI SLOT: ${(slotsNow.items ?? slotsNow ?? []).length}`);
}

main().catch((e) => { console.error('\n✗ FATAL:', e.message); process.exit(1); });
