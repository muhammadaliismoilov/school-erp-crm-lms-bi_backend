// Yuton School uchun API orqali real ma'lumot to'ldirish (o'chirmaydi, faqat qo'shadi).
// Ishga tushirish: node scripts/seed-yuton-via-api.mjs
import { readFileSync } from 'node:fs';

const BASE = process.env.SEED_BASE || 'http://localhost:5000/api/v1';
const YUTON_SCHOOL_ID = '2ca28a71-78f7-44a0-9a23-852c041a28ea';
const TAG = Date.now().toString(36).slice(-5).toUpperCase(); // noyob kod prefiksi

// .env dan admin login
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

// To'lov turlari (DB dan olingan mavjud UUID lar)
const PAY = {
  naqd: 'bbde0734-42a9-48c4-850c-0edea8a017ef',
  karta: 'd97b5196-6efc-4481-be37-b557c2d9d1b8',
  click: 'ab62d623-998f-452f-b3a0-bb01680879ed',
  payme: 'd242e4c8-dd86-4049-b9c6-4c442deb1026',
};

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
    const det = JSON.stringify(json?.error?.details || json?.error || '').slice(0, 300);
    throw new Error(`${method} ${path} -> ${res.status} ${msg} ${det}`);
  }
  return json.data ?? json;
}

// Xatoga chidamli create — bittasi yiqilsa butun seed to'xtamasin
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
const pad = (n, w = 3) => String(n).padStart(w, '0');

async function main() {
  // 1) Login
  const auth = await api('POST', '/auth/login', {
    login: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  });
  TOKEN = auth.accessToken;
  console.log(`✓ Login OK (${env.ADMIN_USERNAME}), TAG=${TAG}\n`);

  // 2) Bo'limlar (departments)
  console.log('▶ Bo\'limlar...');
  const deptDefs = [
    { name: `O'quv bo'limi ${TAG}`, code: `EDU-${TAG}` },
    { name: `Moliya bo'limi ${TAG}`, code: `FIN-${TAG}` },
    { name: `Ma'muriyat ${TAG}`, code: `ADM-${TAG}` },
  ];
  const depts = [];
  for (const d of deptDefs) {
    const r = await tryCreate('departments', '/hr/departments', d);
    if (r) depts.push(r);
  }

  // 3) Lavozimlar (positions)
  console.log('▶ Lavozimlar...');
  const posDefs = [
    { title: `Bosh hisobchi ${TAG}`, departmentId: depts[1]?.id },
    { title: `O'quv bo'lim boshlig'i ${TAG}`, departmentId: depts[0]?.id },
    { title: `Xavfsizlik xodimi ${TAG}`, departmentId: depts[2]?.id },
  ];
  const positions = [];
  for (const p of posDefs) {
    const r = await tryCreate('positions', '/hr/positions', p);
    if (r) positions.push(r);
  }

  // 4) Xodimlar (staff) — loginли, rol bilan
  console.log('▶ Xodimlar (staff)...');
  const staffDefs = [
    { firstName: 'Dilnoza', lastName: 'Rahimova', gender: 'female', roleName: 'accountant', positionId: positions[0]?.id, departmentId: depts[1]?.id, salary: 6500000 },
    { firstName: 'Sardor', lastName: 'Yusupov', gender: 'male', roleName: 'operator', departmentId: depts[2]?.id, salary: 4500000 },
    { firstName: 'Kamola', lastName: 'Ismoilova', gender: 'female', roleName: 'psychologist', departmentId: depts[0]?.id, salary: 5200000 },
    { firstName: 'Bekzod', lastName: 'Tursunov', gender: 'male', roleName: 'tutor', departmentId: depts[0]?.id, salary: 4800000 },
    { firstName: 'Nigora', lastName: 'Saidova', gender: 'female', roleName: 'accountant', positionId: positions[0]?.id, departmentId: depts[1]?.id, salary: 5800000 },
  ];
  for (let i = 0; i < staffDefs.length; i++) {
    const s = staffDefs[i];
    await tryCreate('staff', '/hr/staff', {
      employeeCode: `EMP-${TAG}-${pad(i + 1)}`,
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender,
      phone: `+9989${pad(Math.floor(Math.random() * 99999999), 8)}`,
      hireDate: '2026-09-01',
      status: 'active',
      salary: s.salary,
      departmentId: s.departmentId,
      positionId: s.positionId,
      roleName: s.roleName,
    });
  }

  // 5) O'qituvchilar (teachers) — staff avtomatik yaratiladi
  console.log('▶ O\'qituvchilar (teachers)...');
  const teacherDefs = [
    { firstName: 'Aziz', lastName: 'Karimov', gender: 'male', category: 'oliy', degree: 'master', exp: 12, rate: 90000 },
    { firstName: 'Malika', lastName: 'Yo\'ldosheva', gender: 'female', category: 'birinchi', degree: 'bachelor', exp: 8, rate: 75000 },
    { firstName: 'Jasur', lastName: 'Ergashev', gender: 'male', category: 'ikkinchi', degree: 'bachelor', exp: 5, rate: 65000 },
    { firstName: 'Zilola', lastName: 'Nazarova', gender: 'female', category: 'oliy', degree: 'phd', exp: 15, rate: 110000 },
    { firstName: 'Otabek', lastName: 'Sobirov', gender: 'male', category: 'mutaxassis', degree: 'bachelor', exp: 3, rate: 55000 },
    { firstName: 'Gulnoza', lastName: 'Abdullayeva', gender: 'female', category: 'birinchi', degree: 'master', exp: 9, rate: 80000 },
  ];
  for (let i = 0; i < teacherDefs.length; i++) {
    const t = teacherDefs[i];
    await tryCreate('teachers', '/hr/teachers', {
      firstName: t.firstName,
      lastName: t.lastName,
      gender: t.gender,
      phone: `+9989${pad(Math.floor(Math.random() * 99999999), 8)}`,
      birthDate: `19${80 + i}-0${(i % 9) + 1}-15`,
      workType: 'full',
      employmentType: 'primary',
      status: 'active',
      category: t.category,
      degree: t.degree,
      experienceYears: t.exp,
      ratePerLesson: t.rate,
      startDate: '2026-09-01',
      isSubjectTeacher: true,
      isClassLeader: i < 2,
    });
  }

  // 6) Manager va Direktor (users, rollar bilan)
  console.log('▶ Manager / Direktor (users)...');
  const userDefs = [
    { role: ['director'], firstName: 'Rustam', fc: 'Рустам', lastName: 'Aliyev', lc: 'Алиев', gender: 'male' },
    { role: ['manager'], firstName: 'Feruza', fc: 'Феруза', lastName: 'Qodirova', lc: 'Кодирова', gender: 'female' },
    { role: ['manager'], firstName: 'Shohruh', fc: 'Шохрух', lastName: 'Mirzayev', lc: 'Мирзаев', gender: 'male' },
    { role: ['sales-manager'], firstName: 'Laylo', fc: 'Лайло', lastName: 'Xolmatova', lc: 'Холматова', gender: 'female' },
  ];
  for (let i = 0; i < userDefs.length; i++) {
    const u = userDefs[i];
    await tryCreate('users', '/users', {
      username: `${u.role[0]}.${u.lastName.toLowerCase().replace(/[^a-z]/g, '')}.${TAG.toLowerCase()}`,
      firstName: u.firstName,
      firstNameCyrillic: u.fc,
      lastName: u.lastName,
      lastNameCyrillic: u.lc,
      gender: u.gender,
      phone: `+9989${pad(Math.floor(Math.random() * 99999999), 8)}`,
      roleNames: u.role,
      schoolId: YUTON_SCHOOL_ID,
    });
  }

  // 7) O'quvchilar (students) — billing bilan
  console.log('▶ O\'quvchilar (students)...');
  const firstM = ['Ali', 'Sardor', 'Jasur', 'Bexruz', 'Doston', 'Umar'];
  const firstF = ['Sevara', 'Madina', 'Nilufar', 'Sarvara', 'Gulnoza', 'Dildora'];
  const lasts = ['Valiyev', 'Karimov', 'Tosheva', 'Ergasheva', 'Sobirov', 'Yusupova', 'Rahimov', 'Ismoilova', 'Nazarov', 'Saidova'];
  const students = [];
  for (let i = 0; i < 12; i++) {
    const male = i % 2 === 0;
    const fee = rand([1800000, 2050000, 2400000, 2800000]);
    const st = await tryCreate('students', '/students', {
      firstName: male ? rand(firstM) : rand(firstF),
      lastName: rand(lasts),
      gender: male ? 'male' : 'female',
      birthDate: `20${13 + (i % 5)}-0${(i % 9) + 1}-1${i % 9}`,
      preferredLanguage: 'uz',
      studentCode: `ST-${TAG}-${pad(i + 1, 4)}`,
      status: 'active',
      monthlyFee: fee,
      discountType: 'percent',
      discountValue: rand([0, 0, 10, 15, 25]),
      billingStartDate: '2026-09-01',
      paymentPlan: 'monthly',
      region: 'Toshkent',
      district: rand(['Yunusobod', 'Chilonzor', 'Mirzo Ulug\'bek', 'Yakkasaroy']),
      personalPhone: `+9989${pad(Math.floor(Math.random() * 99999999), 8)}`,
      guardianFullName: `${rand(lasts)} ${rand(['Akmal', 'Botir', 'Shavkat', 'Dilshod'])}`,
      guardianRelation: 'father',
      guardianPhone: `+9989${pad(Math.floor(Math.random() * 99999999), 8)}`,
    });
    if (st?.id) students.push({ id: st.id, fee });
  }

  // 8) To'lovlar (student payments) — har o'quvchiga 2-3 oy
  console.log('▶ To\'lovlar (student payments)...');
  const payTypes = Object.values(PAY);
  for (const s of students) {
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
  }

  // Xulosa
  console.log('\n════════ NATIJA ════════');
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(14)}: +${v}`);
  console.log('════════════════════════');
}

main().catch((e) => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
