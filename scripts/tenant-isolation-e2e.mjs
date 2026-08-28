// Maktab izolyatsiyasi va modul bayroqlari — HAQIQIY HTTP zanjiri bo'ylab tekshiruv.
//
// NEGA KERAK: spec fayllari servis metodlarini mock repozitoriylar bilan
// chaqiradi. Ular mantiqni isbotlaydi, lekin guard -> interceptor -> controller
// -> service zanjiri haqiqatda ulanganini emas. Aynan shu zanjirda ikkita
// nuqson chiqqan edi (2026-08-28): `/schools` da tenant filtri umuman yo'qligi
// va qorovulning `TenantContextService` dan o'qishga urinishi (qorovullar
// interceptor'dan OLDIN ishlaydi, kontekst hali bo'sh).
//
// Ishga tushirish (backend :5000 da turgan holda):
//   ADMIN_LOGIN=... ADMIN_PASS=... DIRECTOR_LOGIN=... DIRECTOR_PASS=... \
//     node scripts/tenant-isolation-e2e.mjs
//
// NON-DESTRUKTIV: modulni yoqib, oxirida ASL holatiga qaytaradi.
const BASE = process.env.TENANT_BASE || 'http://localhost:5000/api/v1';

const ADMIN_LOGIN = process.env.ADMIN_LOGIN;
const ADMIN_PASS = process.env.ADMIN_PASS;
const DIRECTOR_LOGIN = process.env.DIRECTOR_LOGIN || 'rbac-e2e-director';
const DIRECTOR_PASS = process.env.DIRECTOR_PASS || 'RbacE2E!2026';

if (!ADMIN_LOGIN || !ADMIN_PASS) {
  console.error('ADMIN_LOGIN va ADMIN_PASS berilishi shart (global CEO hisobi).');
  process.exit(1);
}

async function login(l, p) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: l, password: p }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Login yiqildi (${l}): ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  return json.data;
}

const api = (token, method, path, body, school) =>
  fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(school ? { 'X-School-Id': school } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (res) => ({ status: res.status, json: await res.json().catch(() => ({})) }));

const natijalar = [];
function tekshir(nom, kutilgan, olingan, izoh = '') {
  const otdi = kutilgan === olingan;
  natijalar.push({ nom, kutilgan, olingan, otdi });
  console.log(`  ${otdi ? '✓' : '✗'} ${nom}\n      kutilgan: ${kutilgan}, olingan: ${olingan}${izoh ? ` — ${izoh}` : ''}`);
}

async function main() {
  console.log('=== Maktab izolyatsiyasi va modullar — end-to-end ===\n');

  const ceo = await login(ADMIN_LOGIN, ADMIN_PASS);
  const dir = await login(DIRECTOR_LOGIN, DIRECTOR_PASS);
  if (ceo.user.schoolId !== null) throw new Error('ADMIN_LOGIN global hisob bo\'lishi kerak (schoolId=null)');
  if (!dir.user.schoolId) throw new Error('DIRECTOR_LOGIN maktabga bog\'langan bo\'lishi kerak');
  const oz = dir.user.schoolId;

  const hammasi = await api(ceo.accessToken, 'GET', '/schools?limit=50');
  const begona = hammasi.json.data.items.find((s) => s.id !== oz)?.id;
  console.log(`   CEO: ${ceo.user.username} | direktor: ${dir.user.username} (${dir.user.schoolName})\n`);

  console.log('1) MAKTAB RO\'YXATI — direktor faqat o\'zinikini ko\'radi');
  let r = await api(dir.accessToken, 'GET', '/schools?limit=50');
  tekshir('direktor 1 ta maktab ko\'radi', 1, r.json?.data?.total);
  tekshir('statistika ham 1 ta', 1, r.json?.data?.stats?.schoolCount);
  r = await api(ceo.accessToken, 'GET', '/schools?limit=50');
  tekshir('CEO hammasini ko\'radi (regressiya qorovuli)', true, (r.json?.data?.total ?? 0) > 1);

  console.log('\n2) MAKTAB BOSHQARUVI — faqat CEO');
  r = await api(dir.accessToken, 'GET', `/schools/${begona}`);
  tekshir('direktor begona maktabni ocha olmaydi', 404, r.status);
  r = await api(dir.accessToken, 'POST', '/schools', { name: 'Sinov', totalCapacity: 10 });
  tekshir('direktor maktab yarata olmaydi', 403, r.status);
  r = await api(dir.accessToken, 'DELETE', `/schools/${begona}`);
  tekshir('direktor begona maktabni o\'chira olmaydi', 403, r.status);

  console.log('\n3) MODUL BAYROG\'I — integratsiyalar');
  const aslHolat = (await api(ceo.accessToken, 'GET', `/schools/${oz}/modules`)).json?.data?.integrations ?? false;

  await api(ceo.accessToken, 'PATCH', `/schools/${oz}/modules`, { module: 'integrations', enabled: false });
  r = await api(dir.accessToken, 'GET', '/integrations');
  tekshir('o\'chiq bo\'lsa direktor kira olmaydi', 403, r.status);
  r = await api(ceo.accessToken, 'GET', '/integrations', null, oz);
  tekshir('o\'chiq bo\'lsa CEO ham kira olmaydi', 403, r.status);
  r = await api(dir.accessToken, 'PATCH', `/schools/${oz}/modules`, { module: 'integrations', enabled: true });
  tekshir('direktor o\'zi yoqa olmaydi', 403, r.status);

  await api(ceo.accessToken, 'PATCH', `/schools/${oz}/modules`, { module: 'integrations', enabled: true });
  r = await api(dir.accessToken, 'GET', '/integrations');
  tekshir('CEO yoqqach direktor DARHOL kiradi (kesh kutilmaydi)', 200, r.status);
  r = await api(ceo.accessToken, 'GET', '/integrations');
  tekshir('"Barcha maktablar"da CEO baribir kira olmaydi', 403, r.status);

  // Asl holatga qaytarish — skript non-destruktiv.
  await api(ceo.accessToken, 'PATCH', `/schools/${oz}/modules`, { module: 'integrations', enabled: aslHolat });

  console.log('\n4) REGRESSIYA — to\'g\'ri ishlayotgan bo\'limlar tegilmagan');
  for (const [nom, yol] of [['Foydalanuvchilar', '/users?limit=1'], ['Rollar', '/roles?limit=100'], ['Takliflar', '/appeals?limit=1']]) {
    r = await api(dir.accessToken, 'GET', yol);
    tekshir(`direktor ${nom} bo'limini ochadi`, 200, r.status);
  }

  const yiqilgan = natijalar.filter((n) => !n.otdi);
  console.log(`\n=== NATIJA: ${natijalar.length - yiqilgan.length}/${natijalar.length} o'tdi ===`);
  if (yiqilgan.length > 0) {
    for (const y of yiqilgan) console.log(`  ✗ ${y.nom} (kutilgan ${y.kutilgan}, olingan ${y.olingan})`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('\nTekshiruv bajarilmadi:', e.message);
  process.exit(1);
});
