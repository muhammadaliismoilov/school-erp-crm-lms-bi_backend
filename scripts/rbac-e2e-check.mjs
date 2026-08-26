// RBAC ierarxiyasi — HAQIQIY HTTP zanjiri bo'ylab tekshiruv (4-bosqich qorovuli).
//
// NEGA KERAK: mavjud spec fayllari servis metodlarini mock repozitoriylar bilan
// chaqiradi. Ular `assertPrivilegedRolesManageable` mantig'ini isbotlaydi, lekin
// guard -> controller -> service zanjiri haqiqatda ulanganini emas. Bu skript
// aynan shuni tekshiradi: real login, real JWT, real so'rovlar.
//
// Ishga tushirish (backend :5000 da turgan holda):
//   node scripts/rbac-e2e-check.mjs
//
// NON-DESTRUKTIV: faqat qo'shadi. Yaratilgan test foydalanuvchilari va rollari
// ataylab bazada QOLDIRILADI (loyiha konvensiyasi) — nomlari `rbac-e2e-`
// prefiksi bilan boshlanadi, takroran ishga tushirilsa qayta ishlatiladi.
import { readFileSync } from 'node:fs';

const BASE = process.env.RBAC_BASE || 'http://localhost:5000/api/v1';
const SCHOOL_ID = process.env.RBAC_SCHOOL_ID || '2ca28a71-78f7-44a0-9a23-852c041a28ea';
// Test foydalanuvchilari uchun — faqat lokal sinov ma'lumoti.
const TEST_PAROL = 'RbacE2E!2026';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

/**
 * `maktabsiz: true` — `X-School-Id` yuborilmaydi.
 *
 * NEGA KERAK: `ceo`/`director` GLOBAL rollar (`school_id IS NULL`), va
 * `RolesService.assertRoleIsEditable` maktab konteksti mavjud bo'lsa global
 * rolni boshqarishni umuman taqiqlaydi ("Global role can only be managed by
 * super admin"). Bu RBAC'dan ALOHIDA, undan OLDIN ishlaydigan tenant qatlami.
 * Himoyalangan-rol tekshiruvigacha yetib borish uchun sarlavha yuborilmaydi.
 */
async function api(token, method, path, body, maktabsiz = false) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(token && !maktabsiz ? { 'X-School-Id': SCHOOL_ID } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && json.success !== false, json };
}

async function login(loginNomi, parol) {
  const r = await api(null, 'POST', '/auth/login', { login: loginNomi, password: parol });
  if (!r.ok) throw new Error(`Login muvaffaqiyatsiz (${loginNomi}): ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  const d = r.json.data ?? r.json;
  return { token: d.accessToken, user: d.user };
}

/**
 * Test foydalanuvchisini yaratadi (yoki mavjudini qayta ishlatadi) va uning
 * tokeni bilan birga qaytaradi.
 *
 * ID ni `GET /users` ro'yxatidan emas, LOGIN javobidan olamiz: ro'yxat
 * endpointi o'z filtrlariga ega va bu skript uchun ishonchsiz manba.
 */
async function testFoydalanuvchi(adminToken, username, rol) {
  const r = await api(adminToken, 'POST', '/users', {
    username,
    password: TEST_PAROL,
    firstName: 'RBAC',
    lastName: `Sinov ${rol}`,
    gender: 'male',
    roleNames: [rol],
    schoolId: SCHOOL_ID,
  });
  // 409 = allaqachon mavjud (oldingi ishga tushirishdan) — bu kutilgan holat.
  if (!r.ok && r.json?.error?.code !== 'USER_IDENTITY_ALREADY_EXISTS') {
    throw new Error(`Foydalanuvchi yaratilmadi (${username}): ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
  }
  const { token, user } = await login(username, TEST_PAROL);
  if (!user?.roles?.includes(rol)) {
    throw new Error(`${username} da '${rol}' roli yo'q (bor: ${JSON.stringify(user?.roles)})`);
  }
  return { id: user.id, token, user };
}

const natijalar = [];
function tekshir(nom, kutilgan, olingan, izoh = '') {
  const otdi = kutilgan === olingan;
  natijalar.push({ nom, kutilgan, olingan, otdi, izoh });
  console.log(`  ${otdi ? '✓' : '✗'} ${nom}\n      kutilgan: ${kutilgan}, olingan: ${olingan}${izoh ? ` — ${izoh}` : ''}`);
}

async function main() {
  console.log('=== RBAC ierarxiyasi — end-to-end tekshiruv ===\n');

  console.log('0) Tayyorgarlik');
  const { token: adminToken } = await login(env.ADMIN_USERNAME, env.ADMIN_PASSWORD);
  console.log('   super-admin login: ✓');

  const rollar = await api(adminToken, 'GET', '/roles?limit=100');
  const roleList = rollar.json?.data?.items ?? rollar.json?.data ?? [];
  const rolTop = (nom) => roleList.find((r) => r.name === nom);
  const ceoRol = rolTop('ceo');
  const directorRol = rolTop('director');
  if (!ceoRol || !directorRol) throw new Error("'ceo' yoki 'director' roli topilmadi");
  console.log(`   rollar topildi: ceo(isPrivileged=${ceoRol.isPrivileged}), director(isPrivileged=${directorRol.isPrivileged})`);

  const direktor = await testFoydalanuvchi(adminToken, 'rbac-e2e-director', 'director');
  const bosh = await testFoydalanuvchi(adminToken, 'rbac-e2e-ceo', 'ceo');
  const nishon = await testFoydalanuvchi(adminToken, 'rbac-e2e-nishon', 'teacher');
  console.log('   test foydalanuvchilari tayyor: director, ceo, nishon\n');

  const directorToken = direktor.token;
  const ceoToken = bosh.token;

  console.log('1) DIREKTOR aktor — himoyalangan qatlam TO\'SILISHI kerak');

  let r = await api(directorToken, 'PATCH', `/users/${nishon.id}/roles`, { roleNames: ['director'] });
  tekshir('director birovni DIREKTOR qila olmaydi', 403, r.status, r.json?.error?.message?.slice(0, 90));

  r = await api(directorToken, 'PATCH', `/users/${nishon.id}/roles`, { roleNames: ['ceo'] });
  tekshir('director birovni CEO qila olmaydi', 403, r.status, r.json?.error?.message?.slice(0, 90));

  r = await api(directorToken, 'PATCH', `/roles/${ceoRol.id}`, { title: { uz: 'Buzishga urinish' } }, true);
  tekshir('director CEO ROLINI tahrirlay olmaydi', 403, r.status, r.json?.error?.message?.slice(0, 90));

  r = await api(directorToken, 'PATCH', `/roles/${directorRol.id}`, { title: { uz: 'Buzishga urinish' } }, true);
  tekshir('director DIREKTOR ROLINI tahrirlay olmaydi', 403, r.status, r.json?.error?.message?.slice(0, 90));

  r = await api(directorToken, 'DELETE', `/roles/${ceoRol.id}`, null, true);
  tekshir('director CEO rolini o\'chira olmaydi', 403, r.status, r.json?.error?.message?.slice(0, 90));

  r = await api(directorToken, 'POST', '/roles', {
    name: `rbac-e2e-superrol-${Date.now().toString(36)}`,
    title: { uz: 'Imtiyoz oshirishga urinish' },
    permissionCodes: ['*.*'],
  });
  tekshir('director `*.*` beruvchi rol YARATA OLMAYDI', 403, r.status, r.json?.error?.message?.slice(0, 90));

  console.log('\n2) DIREKTOR aktor — oddiy ishlar ISHLASHI kerak');

  r = await api(directorToken, 'PATCH', `/users/${nishon.id}/roles`, { roleNames: ['teacher'] });
  tekshir('director oddiy rol (teacher) biriktira oladi', 200, r.status, r.json?.error?.message?.slice(0, 90));

  const yangiRolNomi = `rbac-e2e-oddiy-${Date.now().toString(36)}`;
  r = await api(directorToken, 'POST', '/roles', {
    name: yangiRolNomi,
    title: { uz: 'RBAC sinov roli' },
    permissionCodes: ['students.read'],
  });
  tekshir('director oddiy rol yarata oladi', 201, r.status, r.json?.error?.message?.slice(0, 90));

  console.log('\n3) Katalog filtri (6-bosqich)');
  r = await api(directorToken, 'GET', '/permissions/catalog');
  const katalogMatn = JSON.stringify(r.json);
  tekshir('katalogda `*.*` YO\'Q', false, katalogMatn.includes('"*.*"'));

  console.log('\n4) CEO aktor — himoyalangan qatlam OCHIQ bo\'lishi kerak');

  r = await api(ceoToken, 'PATCH', `/users/${nishon.id}/roles`, { roleNames: ['director'] });
  tekshir('CEO birovni DIREKTOR qila oladi', 200, r.status, r.json?.error?.message?.slice(0, 90));

  // Nishonni asl holatiga qaytaramiz (test ma'lumoti tartibli qolsin).
  await api(ceoToken, 'PATCH', `/users/${nishon.id}/roles`, { roleNames: ['teacher'] });

  r = await api(ceoToken, 'PATCH', `/roles/${directorRol.id}`, {
    title: directorRol.title ?? { uz: 'Direktor', ru: 'Директор', en: 'Director' },
  }, true);
  tekshir('CEO direktor rolini tahrirlay oladi', 200, r.status, r.json?.error?.message?.slice(0, 90));

  const yiqilgan = natijalar.filter((n) => !n.otdi);
  console.log(`\n=== NATIJA: ${natijalar.length - yiqilgan.length}/${natijalar.length} o'tdi ===`);
  if (yiqilgan.length > 0) {
    console.log('\nYIQILGANLAR:');
    for (const y of yiqilgan) console.log(`  ✗ ${y.nom} (kutilgan ${y.kutilgan}, olingan ${y.olingan}) ${y.izoh}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('\nTekshiruv bajarilmadi:', e.message);
  process.exit(1);
});
