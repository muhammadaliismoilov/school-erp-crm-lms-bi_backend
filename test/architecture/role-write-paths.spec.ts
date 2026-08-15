import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Arxitektura qorovuli: foydalanuvchi rollari YOZILADIGAN yo'llar ro'yxati.
 *
 * T-02 tuzatishining asosi — rol biriktirishning har bir yo'li Q2/Q3
 * siyosatidan (privilege.policy) o'tishi. Siyosatning o'zi buzilmaydi, lekin
 * YANGI yo'l siyosatsiz qo'shilishi mumkin: kimdir biror service'da
 * `user.roles = [...]` deb yozadi va imtiyoz oshirish eshigi jimgina qaytadan
 * ochiladi. Bu sinov shunday yo'l paydo bo'lganda quлaydi va muallifni shu
 * izohga olib keladi: yangi yo'l YO siyosatdan o'tsin, YO (faqat server kodida
 * qat'iy belgilangan, mijoz tanlamaydigan rol bo'lsa) quyidagi ro'yxatga
 * sababi bilan qo'shilsin.
 */
const SRC = join(__dirname, '..', '..', 'src');

/** Rol yozishga ruxsat etilgan fayllar va sabablari. */
const ALLOWED_ROLE_WRITERS: Record<string, string> = {
  'modules/users/users.service.ts':
    'create/assignRoles — privilege.policy (Q2/Q3) dan o\'tadi; createParent — server kodida qat\'iy PARENT roli',
  'modules/hr/staff.service.ts':
    'assignRoleToLinkedUser — roles.assign talabi + privilege.policy; createStaff — UsersService.create orqali siyosatdan o\'tadi',
  'modules/identity/identity-seed.service.ts':
    'bootstrap seed — so\'rov konteksti yo\'q, rollar kod ichida qat\'iy',
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('rol yozuv yo\'llari (T-02 qorovuli)', () => {
  // `.roles =` (entity maydoniga yozish) va `roles: [` obyekt-literal ichida
  // Role massivini berish — ikkala shakl ham qamrab olinadi.
  const rolePattern = /\.roles\s*=\s*|roles:\s*\[\s*\w*[Rr]ole/;

  it('rol yozadigan har bir fayl ruxsat ro\'yxatida', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      if (!file.endsWith('.service.ts')) continue;
      const rel = relative(SRC, file);
      const text = readFileSync(file, 'utf8');
      if (rolePattern.test(text) && !(rel in ALLOWED_ROLE_WRITERS)) {
        offenders.push(rel);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('ruxsat ro\'yxatidagi fayllar hali ham rol yozadi (eskirgan yozuv qolmasin)', () => {
    const stale = Object.keys(ALLOWED_ROLE_WRITERS).filter((rel) => {
      const text = readFileSync(join(SRC, rel), 'utf8');
      return !rolePattern.test(text);
    });
    expect(stale).toEqual([]);
  });

  it('siyosatdan o\'tadigan fayllar privilege.policy ni import qiladi', () => {
    for (const rel of ['modules/users/users.service.ts', 'modules/hr/staff.service.ts']) {
      const text = readFileSync(join(SRC, rel), 'utf8');
      expect(text).toContain("from '../../common/security/privilege.policy'");
    }
  });
});
