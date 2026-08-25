import { ForbiddenException } from '@nestjs/common';
import {
  assertNotSelf,
  assertPasswordResettable,
  assertPrivilegedRolesManageable,
  assertRolesGrantable,
  collectRoleCodes,
  isSuperAdmin,
  uncoveredPermissionCodes,
} from '../../src/common/security/privilege.policy';
import { AppPermission } from '../../src/common/constants/permissions';

const role = (name: string, codes: string[]) => ({
  name,
  permissions: codes.map((code) => ({ code })),
});

describe('uncoveredPermissionCodes', () => {
  it("aktorda bor kodlar qoplangan hisoblanadi", () => {
    expect(
      uncoveredPermissionCodes(['students.read', 'lms.read'], ['students.read']),
    ).toEqual([]);
  });

  it("yetishmagan kodlar saralangan holda qaytadi", () => {
    expect(
      uncoveredPermissionCodes(['students.read'], ['lms.read', 'finance.read']),
    ).toEqual(['finance.read', 'lms.read']);
  });

  it("modul wildcard (`students.*`) modulning istalgan amalini qoplaydi", () => {
    expect(
      uncoveredPermissionCodes(['students.*'], ['students.read', 'students.delete']),
    ).toEqual([]);
  });

  it("to'liq wildcard (`*.*`) hamma narsani qoplaydi", () => {
    expect(uncoveredPermissionCodes(['*.*'], ['anything.at-all'])).toEqual([]);
  });

  it("maxfiy (counseling) kodlar hisobga olinmaydi — psixolog akkauntini admin ochib bera olsin", () => {
    expect(
      uncoveredPermissionCodes(
        ['students.read'],
        [AppPermission.COUNSELING_READ, AppPermission.COUNSELING_CREATE, 'students.read'],
      ),
    ).toEqual([]);
  });
});

describe('assertRolesGrantable (Q2 — kuchaytirmaslik)', () => {
  const actorPerms = ['users.update', 'roles.assign', 'students.read', 'lms.read'];

  it("qism-to'plam rol o'tadi", () => {
    expect(() =>
      assertRolesGrantable(actorPerms, [role('teacher', ['students.read', 'lms.read'])]),
    ).not.toThrow();
  });

  it("aktorda yo'q kodli rol 403 beradi va rol nomini aytadi", () => {
    expect(() =>
      assertRolesGrantable(actorPerms, [role('director', ['finance-contracts.create'])]),
    ).toThrow(ForbiddenException);
    try {
      assertRolesGrantable(actorPerms, [role('director', ['finance-contracts.create'])]);
    } catch (error) {
      expect((error as ForbiddenException).message).toContain('director');
      expect((error as ForbiddenException).message).toContain('finance-contracts.create');
    }
  });

  it("bir nechta roldan bittasi ham kuchli bo'lsa — rad", () => {
    expect(() =>
      assertRolesGrantable(actorPerms, [
        role('teacher', ['students.read']),
        role('accountant', ['transactions.create']),
      ]),
    ).toThrow(ForbiddenException);
  });

  it("ruxsatsiz (bo'sh) rol har doim o'tadi", () => {
    expect(() => assertRolesGrantable(actorPerms, [role('empty', [])])).not.toThrow();
  });
});

describe('assertPasswordResettable (Q2\' — akkauntni egallashga qarshi)', () => {
  it("nishon ruxsatlari aktornikidan oshmasa — o'tadi", () => {
    expect(() =>
      assertPasswordResettable(
        ['users.reset-password', 'students.read', 'lms.read'],
        [role('teacher', ['students.read', 'lms.read'])],
      ),
    ).not.toThrow();
  });

  it("nishon kuchliroq bo'lsa — 403 (parol tiklash = u nomidan kirish)", () => {
    expect(() =>
      assertPasswordResettable(
        ['users.reset-password', 'students.read'],
        [role('director', ['finance-contracts.create', 'students.read'])],
      ),
    ).toThrow(ForbiddenException);
  });

  it("super-admin nishonni faqat super-admin tiklaydi", () => {
    expect(() =>
      assertPasswordResettable(['users.reset-password'], [role('super-admin', ['*.*'])]),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertPasswordResettable(['*.*'], [role('super-admin', ['*.*'])]),
    ).not.toThrow();
  });
});

describe("assertPrivilegedRolesManageable (RBAC ierarxiyasi — himoyalangan qatlam)", () => {
  const privileged = (name: string) => ({ name, isPrivileged: true });
  const ordinary = (name: string) => ({ name, isPrivileged: false });

  it("himoyalanmagan rollar uchun har doim o'tadi (roles.manage-privileged talab qilinmaydi)", () => {
    expect(() =>
      assertPrivilegedRolesManageable([], [ordinary('teacher'), ordinary('accountant')]),
    ).not.toThrow();
  });

  it("himoyalangan rol uchun kod yo'q aktorga 403 beradi va rol nomini aytadi", () => {
    expect(() =>
      assertPrivilegedRolesManageable(['students.read'], [privileged('director')]),
    ).toThrow(ForbiddenException);
    try {
      assertPrivilegedRolesManageable(['students.read'], [privileged('director')]);
    } catch (error) {
      expect((error as ForbiddenException).message).toContain('director');
    }
  });

  it("director aktor (director kodlarining barchasiga ega) ham CEO/direktor rolini boshqara olmaydi — Q2 bu yerga taalluqli emas", () => {
    // Q2 (assertRolesGrantable) director kodlarini to'liq qoplagan aktorni o'tkazadi,
    // lekin himoyalangan qatlam kod TO'PLAMIGA emas, `roles.manage-privileged`
    // kodining o'ziga qaraydi — direktor darajasidagi keng ruxsat kifoya emas.
    const directorLikePermissions = ['students.read', 'finance.read', 'hr-staff.read'];
    expect(() =>
      assertPrivilegedRolesManageable(directorLikePermissions, [privileged('director')]),
    ).toThrow(ForbiddenException);
  });

  it("roles.manage-privileged kodiga ega aktor uchun o'tadi", () => {
    expect(() =>
      assertPrivilegedRolesManageable(
        [AppPermission.ROLES_MANAGE_PRIVILEGED],
        [privileged('director'), privileged('ceo')],
      ),
    ).not.toThrow();
  });

  it("super-admin (`*.*`) himoyalangan rollarni ham boshqara oladi", () => {
    expect(() =>
      assertPrivilegedRolesManageable(['*.*'], [privileged('director')]),
    ).not.toThrow();
  });

  it("aralash ro'yxatda kamida bitta himoyalangan rol bo'lsa — tekshiriladi", () => {
    expect(() =>
      assertPrivilegedRolesManageable(['students.read'], [ordinary('teacher'), privileged('ceo')]),
    ).toThrow(ForbiddenException);
  });
});

describe('assertNotSelf (Q3)', () => {
  it("o'ziga tegish 403", () => {
    expect(() => assertNotSelf('u1', 'u1', 'rol')).toThrow(ForbiddenException);
    expect(() => assertNotSelf('u1', 'u1', 'parol')).toThrow(ForbiddenException);
  });

  it("boshqa foydalanuvchi — o'tadi; aktor id'siz (ichki chaqiruv) ham o'tadi", () => {
    expect(() => assertNotSelf('u1', 'u2', 'rol')).not.toThrow();
    expect(() => assertNotSelf(undefined, 'u1', 'parol')).not.toThrow();
  });
});

describe('isSuperAdmin', () => {
  it("faqat `*.<amal>` wildcard super-admin hisoblanadi", () => {
    expect(isSuperAdmin(['*.*'])).toBe(true);
    expect(isSuperAdmin(['students.*'])).toBe(false);
    expect(isSuperAdmin(['users.update', 'roles.assign'])).toBe(false);
    expect(isSuperAdmin([])).toBe(false);
  });
});

describe('collectRoleCodes', () => {
  it("rollar kodlarini takrorsiz yig'adi", () => {
    expect(
      collectRoleCodes([
        role('a', ['x.read', 'y.read']),
        role('b', ['y.read', 'z.read']),
      ]).sort(),
    ).toEqual(['x.read', 'y.read', 'z.read']);
  });
});
