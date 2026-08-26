// Global CEO hisobini yaratish/tasdiqlash (idempotent).
//
// NIMA QILADI: `ceo` roli bilan MAKTABGA BOG'LANMAGAN (schoolId = NULL)
// bitta foydalanuvchi yaratadi. Shunday hisob barcha maktablarda ishlaydi —
// `X-School-Id` sarlavhasi orqali istalgan maktab kontekstiga kiradi.
//
// NEGA BITTA GLOBAL HISOB, har maktabga alohida emas: `users.username` bazada
// GLOBAL UNIQUE (`uq_users_username`) — bir xil login bir nechta foydalanuvchida
// bo'la olmaydi. Ya'ni "hamma maktablarda bir xil login" faqat shu yo'l bilan
// mumkin. Naqsh yangi emas: super-admin hisobi ham xuddi shunday ishlaydi.
//
// XAVFSIZLIK ESLATMASI: bu hisob barcha maktablarning ma'lumotiga kira oladi
// va `ceo` roli `roles.manage-privileged`ga ega — ya'ni u direktor tayinlay
// oladi. Paroli kuchli bo'lishi va faqat egasida qolishi shart.
//
// Ishga tushirish:
//   CEO_PASSWORD='...' node scripts/ensure-global-ceo.mjs
//
// Boshqa muhitga (masalan production):
//   CEO_BASE=https://<host>/api/v1 ADMIN_LOGIN=... ADMIN_PASS=... \
//   CEO_PASSWORD='...' node scripts/ensure-global-ceo.mjs
import { readFileSync } from 'node:fs';

const BASE = process.env.CEO_BASE || 'http://localhost:5000/api/v1';
const CEO_USERNAME = process.env.CEO_USERNAME || 'ceoschool';
const CEO_PASSWORD = process.env.CEO_PASSWORD;

if (!CEO_PASSWORD) {
  console.error("CEO_PASSWORD berilmagan. Parol kodda saqlanmaydi — muhit o'zgaruvchisi orqali bering:");
  console.error("  CEO_PASSWORD='...' node scripts/ensure-global-ceo.mjs");
  process.exit(1);
}

// Admin kirish ma'lumoti: muhit o'zgaruvchisi ustun, aks holda lokal `.env`.
let adminLogin = process.env.ADMIN_LOGIN;
let adminPass = process.env.ADMIN_PASS;
if (!adminLogin || !adminPass) {
  const env = Object.fromEntries(
    readFileSync(new URL('../.env', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
  adminLogin = adminLogin || env.ADMIN_USERNAME;
  adminPass = adminPass || env.ADMIN_PASSWORD;
}

async function api(token, method, path, body, schoolId) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(schoolId ? { 'X-School-Id': schoolId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && json.success !== false, json };
}

async function login(loginNomi, parol) {
  const r = await api(null, 'POST', '/auth/login', { login: loginNomi, password: parol });
  if (!r.ok) {
    throw new Error(`Login muvaffaqiyatsiz (${loginNomi}): ${r.status} ${r.json?.error?.message ?? ''}`);
  }
  const d = r.json.data ?? r.json;
  return { token: d.accessToken, user: d.user };
}

async function main() {
  console.log(`=== Global CEO hisobi: ${CEO_USERNAME} ===`);
  console.log(`Muhit: ${BASE}\n`);

  const { token: adminToken } = await login(adminLogin, adminPass);
  console.log('1) Admin login: ✓');

  // MUHIM: `X-School-Id` YUBORILMAYDI va `schoolId` maydoni berilmaydi —
  // shunda foydalanuvchi maktabga bog'lanmaydi (global bo'ladi).
  const yaratish = await api(adminToken, 'POST', '/users', {
    username: CEO_USERNAME,
    password: CEO_PASSWORD,
    firstName: 'Bosh',
    lastName: 'Direktor',
    gender: 'male',
    roleNames: ['ceo'],
  });

  if (yaratish.ok) {
    console.log('2) Foydalanuvchi yaratildi: ✓');
  } else if (yaratish.json?.error?.code === 'USER_IDENTITY_ALREADY_EXISTS') {
    console.log('2) Foydalanuvchi allaqachon mavjud — qayta ishlatiladi');
  } else {
    throw new Error(
      `Yaratib bo'lmadi: ${yaratish.status} ${JSON.stringify(yaratish.json?.error ?? yaratish.json).slice(0, 400)}`,
    );
  }

  // 3) Tasdiqlash: hisob haqiqatan global va `ceo` rolida ekanini LOGIN orqali
  // tekshiramiz — bu ayni foydalanuvchi ko'radigan haqiqat.
  const { token: ceoToken, user } = await login(CEO_USERNAME, CEO_PASSWORD);
  console.log('\n3) Tasdiqlash (CEO o\'z tokeni bilan):');
  console.log(`   roli        : ${JSON.stringify(user.roles)}`);
  console.log(`   schoolId    : ${user.schoolId ?? 'NULL (global) ✓'}`);
  console.log(`   ruxsat soni : ${user.permissions?.length ?? 0}`);
  const manage = user.permissions?.some((c) => c === 'roles.manage-privileged' || c.split('.')[0] === '*');
  console.log(`   roles.manage-privileged: ${manage ? '✓' : '✗'}`);

  const xatolar = [];
  if (!user.roles?.includes('ceo')) xatolar.push("'ceo' roli biriktirilmagan");
  if (user.schoolId) xatolar.push(`maktabga bog'langan (${user.schoolId}) — global emas`);
  if (!manage) xatolar.push("roles.manage-privileged yo'q");

  // 4) Har bir maktabga kira olishini amalda tekshiramiz.
  const maktablar = await api(ceoToken, 'GET', '/schools?limit=100');
  const ro = maktablar.json?.data?.items ?? maktablar.json?.data ?? [];
  console.log(`\n4) Maktablarga kirish (${ro.length} ta):`);
  for (const m of ro) {
    const nom = typeof m.name === 'string' ? m.name : (m.name?.uz ?? m.id);
    const sinov = await api(ceoToken, 'GET', '/users?limit=1', undefined, m.id);
    const belgi = sinov.ok ? '✓' : `✗ (${sinov.status})`;
    console.log(`   ${belgi} ${nom}`);
    if (!sinov.ok) xatolar.push(`${nom}: ${sinov.status}`);
  }

  if (xatolar.length > 0) {
    console.log('\n✗ MUAMMOLAR:');
    for (const x of xatolar) console.log(`   - ${x}`);
    process.exit(1);
  }
  console.log('\n✓ Global CEO hisobi tayyor va barcha maktablarda ishlaydi.');
}

main().catch((e) => {
  console.error('\nBajarilmadi:', e.message);
  process.exit(1);
});
