import type { Repository } from 'typeorm';
import type { Permission } from '../src/modules/identity/entities/permission.entity';
import type { Role } from '../src/modules/identity/entities/role.entity';
import { defaultRoles, syncDefaultRoles, type DefaultRoleDefinition } from '../src/modules/identity/identity-role-sync';
import { AppPermission, WRITE_BUNDLES } from '../src/common/constants/permissions';

/**
 * RBAC ierarxiyasi (5–6-bosqich) — real `defaultRoles` ta'rifining o'zini
 * tekshiradi, `syncDefaultRoles` mexanizmini emas: sintetik fixture'lar bilan
 * yozilgan testlar formula noto'g'ri o'zgarsa ham (masalan kimdir `admin`ga
 * `roles.create`ni qaytarib qo'ysa) sezmay qolardi.
 */
describe("RBAC ierarxiyasi — defaultRoles formulasi", () => {
  const byName = (name: string): DefaultRoleDefinition => {
    const found = defaultRoles.find((role) => role.name === name);
    if (!found) throw new Error(`defaultRoles ichida "${name}" topilmadi`);
    return found;
  };

  it("admin va supermanager rol-boshqaruv kodlariga (roles.create/update/delete/assign) ega EMAS", () => {
    for (const name of ['admin', 'supermanager']) {
      const codes = byName(name).permissions;
      for (const roleCode of WRITE_BUNDLES.roles) {
        expect(codes).not.toContain(roleCode);
      }
    }
  });

  it("director va ceo rol-boshqaruv kodlariga ega", () => {
    for (const name of ['director', 'ceo']) {
      const codes = byName(name).permissions;
      for (const roleCode of WRITE_BUNDLES.roles) {
        expect(codes).toContain(roleCode);
      }
    }
  });

  it("faqat director va ceo isPrivileged=true", () => {
    for (const role of defaultRoles) {
      const expected = role.name === 'director' || role.name === 'ceo';
      expect(Boolean(role.isPrivileged)).toBe(expected);
    }
  });

  it("roles.manage-privileged faqat ceo formulasida bor — director, admin, supermanager'da yo'q", () => {
    expect(byName('ceo').permissions).toContain(AppPermission.ROLES_MANAGE_PRIVILEGED);
    for (const name of ['director', 'admin', 'supermanager']) {
      expect(byName(name).permissions).not.toContain(AppPermission.ROLES_MANAGE_PRIVILEGED);
    }
  });

  /**
   * 2026-08-28: maktab direktori `settings-school.create/delete` ga ega edi,
   * ya'ni yangi maktab yaratishi va BOSHQA maktabni o'chirishi mumkin edi.
   * Maktab kartochkasi — ijarachining o'zi, uni boshqarish tenant chegarasidan
   * yuqoridagi amal. Maktab xodimi endi faqat KO'RADI.
   */
  it("maktab kartochkasini boshqarish faqat ceo'da — director/admin/supermanager faqat o'qiydi", () => {
    for (const code of [
      AppPermission.SETTINGS_SCHOOL_CREATE,
      AppPermission.SETTINGS_SCHOOL_UPDATE,
      AppPermission.SETTINGS_SCHOOL_DELETE,
    ]) {
      expect(byName('ceo').permissions).toContain(code);
      for (const name of ['director', 'admin', 'supermanager']) {
        expect(byName(name).permissions).not.toContain(code);
      }
    }
    // O'qish saqlanadi — o'z maktabi profilini ko'ra olishi kerak.
    for (const name of ['director', 'admin', 'supermanager']) {
      expect(byName(name).permissions).toContain(AppPermission.SETTINGS_SCHOOL_READ);
    }
  });

  it("ceo ruxsatlari director ruxsatlarining ustki to'plami (kamida)", () => {
    const directorCodes = new Set(byName('director').permissions);
    const ceoCodes = new Set(byName('ceo').permissions);
    for (const code of directorCodes) {
      expect(ceoCodes.has(code)).toBe(true);
    }
  });

  it('*.* faqat super-admin formulasida', () => {
    for (const role of defaultRoles) {
      const hasWildcard = role.permissions.includes(AppPermission.SUPER_ADMIN);
      expect(hasWildcard).toBe(role.name === 'super-admin');
    }
  });
});

describe('syncDefaultRoles', () => {
  const directorTitle = { uz: 'Direktor', ru: 'Директор', en: 'Director' };
  const adminTitle = { uz: 'Admin', ru: 'Администратор', en: 'Admin' };

  const permissionStudents = { id: 'p1', code: 'students.read', module: 'students', action: 'read' } as Permission;
  const permissionCrm = { id: 'p2', code: 'crm.manage', module: 'crm', action: 'manage' } as Permission;
  const permissionFinance = { id: 'p3', code: 'finance.read', module: 'finance', action: 'read' } as Permission;

  let roleRepo: jest.Mocked<Pick<Repository<Role>, 'find' | 'save' | 'create' | 'createQueryBuilder'>>;
  let permissionRepo: jest.Mocked<Pick<Repository<Permission>, 'find'>>;

  /**
   * `syncDefaultRoles` mavjud rollarni `createQueryBuilder().leftJoinAndSelect().getMany()`
   * bilan yuklaydi — `find({relations})` EMAS (TypeORM eager+explicit-relations hydration
   * tuzog'idan qochish uchun, faylning o'zidagi izohga qarang).
   */
  const mockExistingRoles = (result: Role[]) => {
    roleRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(result),
    } as unknown as ReturnType<Repository<Role>['createQueryBuilder']>);
  };

  beforeEach(() => {
    roleRepo = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    roleRepo.save.mockImplementation(async (value) => value as Role);
    roleRepo.create.mockImplementation((value) => value as Role);
    permissionRepo = {
      find: jest.fn(),
    };
    permissionRepo.find.mockResolvedValue([permissionStudents, permissionCrm, permissionFinance]);
  });

  const run = (definitions: DefaultRoleDefinition[]) =>
    syncDefaultRoles(
      roleRepo as unknown as Repository<Role>,
      permissionRepo as unknown as Repository<Permission>,
      definitions,
    );

  it('does not write anything when title, isSystem and permission set are unchanged', async () => {
    const existing = {
      id: 'r1',
      name: 'director',
      title: directorTitle,
      isSystem: true,
      isPrivileged: false,
      permissions: [permissionStudents, permissionCrm],
    } as Role;
    mockExistingRoles([existing]);

    const result = await run([
      { name: 'director', title: directorTitle, permissions: ['students.read', 'crm.manage'] },
    ]);

    expect(roleRepo.save).not.toHaveBeenCalled();
    expect(roleRepo.create).not.toHaveBeenCalled();
    expect(result).toEqual({ created: [], updated: [], unchanged: ['director'] });
  });

  it('updates when isPrivileged changes', async () => {
    const existing = {
      id: 'r1',
      name: 'director',
      title: directorTitle,
      isSystem: true,
      isPrivileged: false,
      permissions: [permissionStudents, permissionCrm],
    } as Role;
    mockExistingRoles([existing]);

    const result = await run([
      {
        name: 'director',
        title: directorTitle,
        permissions: ['students.read', 'crm.manage'],
        isPrivileged: true,
      },
    ]);

    expect(roleRepo.save).toHaveBeenCalledTimes(1);
    expect(roleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isPrivileged: true }));
    expect(result).toEqual({ created: [], updated: ['director'], unchanged: [] });
  });

  it('updates when only a localized title field (ru) changes — field-by-field, not JSON.stringify', async () => {
    // JSON.stringify key-order farqi soxta "o'zgarmadi" bermasligini ham tekshiradi:
    // `existing.title` maydonlari boshqacha tartibda yozilgan, lekin qiymatlar farq qiladi.
    const existing = {
      id: 'r1',
      name: 'director',
      title: { en: 'Director', uz: 'Direktor', ru: 'Eski nom' },
      isSystem: true,
      permissions: [permissionStudents, permissionCrm],
    } as Role;
    mockExistingRoles([existing]);

    const result = await run([
      { name: 'director', title: directorTitle, permissions: ['students.read', 'crm.manage'] },
    ]);

    expect(roleRepo.save).toHaveBeenCalledTimes(1);
    expect(roleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ title: directorTitle }));
    expect(result).toEqual({ created: [], updated: ['director'], unchanged: [] });
  });

  it('treats a reordered but identical permission code set as unchanged (set-based comparison)', async () => {
    const existing = {
      id: 'r1',
      name: 'director',
      title: directorTitle,
      isSystem: true,
      isPrivileged: false,
      // Ta'rifdagi tartibga qarama-qarshi tartibda.
      permissions: [permissionCrm, permissionStudents],
    } as Role;
    mockExistingRoles([existing]);

    const result = await run([
      { name: 'director', title: directorTitle, permissions: ['students.read', 'crm.manage'] },
    ]);

    expect(roleRepo.save).not.toHaveBeenCalled();
    expect(result.unchanged).toEqual(['director']);
  });

  it('updates when the permission code set actually differs', async () => {
    const existing = {
      id: 'r1',
      name: 'director',
      title: directorTitle,
      isSystem: true,
      permissions: [permissionStudents],
    } as Role;
    mockExistingRoles([existing]);

    const result = await run([
      { name: 'director', title: directorTitle, permissions: ['students.read', 'crm.manage', 'finance.read'] },
    ]);

    expect(roleRepo.save).toHaveBeenCalledTimes(1);
    expect(roleRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: expect.arrayContaining([permissionStudents, permissionCrm, permissionFinance]),
      }),
    );
    expect(result).toEqual({ created: [], updated: ['director'], unchanged: [] });
  });

  it('creates a role that does not exist yet', async () => {
    mockExistingRoles([]);

    const result = await run([
      { name: 'director', title: directorTitle, permissions: ['students.read'] },
    ]);

    expect(roleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'director', title: directorTitle, isSystem: true }),
    );
    expect(roleRepo.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ created: ['director'], updated: [], unchanged: [] });
  });

  it('maps each existing role to the correct definition when several are fetched in one query', async () => {
    // director'ning mavjud ruxsatlari ta'rifga mos (unchanged bo'lishi kerak),
    // admin'niki mos EMAS (updated bo'lishi kerak). Agar Map noto'g'ri kalitlansa,
    // bu ikkalasi teskari chiqadi.
    const existingDirector = {
      id: 'r1',
      name: 'director',
      title: directorTitle,
      isSystem: true,
      isPrivileged: false,
      permissions: [permissionStudents],
    } as Role;
    const existingAdmin = {
      id: 'r2',
      name: 'admin',
      title: adminTitle,
      isSystem: true,
      isPrivileged: false,
      permissions: [permissionStudents],
    } as Role;
    mockExistingRoles([existingDirector, existingAdmin]);

    const result = await run([
      { name: 'director', title: directorTitle, permissions: ['students.read'] },
      { name: 'admin', title: adminTitle, permissions: ['students.read', 'crm.manage'] },
    ]);

    expect(result.unchanged).toEqual(['director']);
    expect(result.updated).toEqual(['admin']);
    expect(roleRepo.save).toHaveBeenCalledTimes(1);
    expect(roleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'admin' }));
  });

  it('drops duplicate permission codes within a single definition before comparing', async () => {
    const existing = {
      id: 'r1',
      name: 'director',
      title: directorTitle,
      isSystem: true,
      isPrivileged: false,
      permissions: [permissionStudents, permissionCrm],
    } as Role;
    mockExistingRoles([existing]);

    const result = await run([
      {
        name: 'director',
        title: directorTitle,
        permissions: ['students.read', 'crm.manage', 'students.read'],
      },
    ]);

    expect(roleRepo.save).not.toHaveBeenCalled();
    expect(result.unchanged).toEqual(['director']);
  });
});
