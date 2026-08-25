import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../src/common/security/authenticated-user.interface';
import type { Permission } from '../src/modules/identity/entities/permission.entity';
import type { Role } from '../src/modules/identity/entities/role.entity';
import { RolesService } from '../src/modules/identity/roles.service';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

const actorWith = (permissions: string[]): AuthenticatedUser => ({
  id: 'actor-1',
  username: 'actor',
  roles: [],
  permissions,
});

describe('RolesService', () => {
  const roleId = 'c9c1df8f-2c6d-4f55-a60a-d29127b3ebd6';
  const permissionsList = [
    { id: 'p1', code: 'students.read', module: 'students', action: 'read' },
    { id: 'p2', code: 'crm.manage', module: 'crm', action: 'manage' },
  ] as Permission[];
  const role = {
    id: roleId,
    name: 'teacher',
    title: { uz: "O'qituvchi", ru: 'Учитель', en: 'Teacher' },
    description: { uz: 'Dars beruvchi xodim' },
    isSystem: false,
    permissions: permissionsList,
    createdAt: new Date('2026-06-08T00:00:00.000Z'),
    updatedAt: new Date('2026-06-08T00:00:00.000Z'),
    version: 1,
  } as Role;
  let roles: jest.Mocked<
    Pick<Repository<Role>, 'create' | 'save' | 'find' | 'findOne' | 'count' | 'softDelete' | 'createQueryBuilder'>
  >;
  let permissions: jest.Mocked<Pick<Repository<Permission>, 'find' | 'count'>>;
  let service: RolesService;

  /**
   * `findRoleEntity` (RolesService ichida) `createQueryBuilder().leftJoinAndSelect().where().getOne()`
   * ishlatadi — `findOne({relations})` EMAS (sabab: identity-role-sync.ts dagi izohga qarang,
   * TypeORM hydration'da eager+explicit-relations kombinatsiyasi o'lchanmagan darajada sekin).
   */
  const mockQueryBuilder = (result: Role | null) => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(result),
    };
    return qb as unknown as ReturnType<Repository<Role>['createQueryBuilder']>;
  };

  beforeEach(() => {
    roles = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    permissions = {
      find: jest.fn(),
      count: jest.fn(),
    };
    service = new RolesService(
      roles as unknown as Repository<Role>,
      permissions as unknown as Repository<Permission>,
      new TenantContextService(),
    );
  });

  it('creates role with normalized name and resolved permissions', async () => {
    roles.findOne.mockResolvedValue(null);
    permissions.find.mockResolvedValue(permissionsList);
    roles.create.mockImplementation((value) => value as Role);
    roles.save.mockImplementation(async (value) => ({ ...role, ...value }) as Role);

    const result = await service.create({
      name: 'Sales Manager',
      title: { uz: 'Sotuv menejeri', ru: 'Менеджер продаж', en: 'Sales Manager' },
      permissionCodes: ['students.read', 'crm.manage'],
    });

    expect(roles.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'sales-manager',
        title: { uz: 'Sotuv menejeri', ru: 'Менеджер продаж', en: 'Sales Manager' },
        isSystem: false,
        permissions: permissionsList,
      }),
    );
    expect(result).toMatchObject({
      name: 'sales-manager',
      displayName: 'SALES_MANAGER',
      permissionCount: 2,
    });
  });

  it('fills missing ru/en locales from uz for title and description', async () => {
    roles.findOne.mockResolvedValue(null);
    permissions.find.mockResolvedValue(permissionsList);
    roles.create.mockImplementation((value) => value as Role);
    roles.save.mockImplementation(async (value) => ({ ...role, ...value }) as Role);

    await service.create({
      name: 'Sales',
      title: { uz: 'Sotuv menejeri' },
      description: { uz: 'Sotuv va CRM amallari uchun rol' },
      permissionCodes: ['students.read', 'crm.manage'],
    });

    expect(roles.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: { uz: 'Sotuv menejeri', ru: 'Sotuv menejeri', en: 'Sotuv menejeri' },
        description: {
          uz: 'Sotuv va CRM amallari uchun rol',
          ru: 'Sotuv va CRM amallari uchun rol',
          en: 'Sotuv va CRM amallari uchun rol',
        },
      }),
    );
  });

  it('stores null description when none provided', async () => {
    roles.findOne.mockResolvedValue(null);
    permissions.find.mockResolvedValue(permissionsList);
    roles.create.mockImplementation((value) => value as Role);
    roles.save.mockImplementation(async (value) => ({ ...role, ...value }) as Role);

    await service.create({ name: 'Sales', permissionCodes: ['students.read'] });

    expect(roles.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
    );
  });

  it('rejects duplicate role name', async () => {
    roles.findOne.mockResolvedValue(role);

    await expect(
      service.create({ name: 'Teacher', permissionCodes: ['students.read'] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects creating a role with a permission code the actor does not hold (Q2)', async () => {
    roles.findOne.mockResolvedValue(null);
    permissions.find.mockResolvedValue(permissionsList);

    await expect(
      service.create(
        { name: 'Sales Manager', permissionCodes: ['students.read', 'crm.manage'] },
        actorWith(['students.read']),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roles.save).not.toHaveBeenCalled();
  });

  it('allows creating a role when the actor covers every requested code', async () => {
    roles.findOne.mockResolvedValue(null);
    permissions.find.mockResolvedValue(permissionsList);
    roles.create.mockImplementation((value) => value as Role);
    roles.save.mockImplementation(async (value) => ({ ...role, ...value }) as Role);

    await expect(
      service.create(
        { name: 'Sales Manager', permissionCodes: ['students.read', 'crm.manage'] },
        actorWith(['students.read', 'crm.manage']),
      ),
    ).resolves.toBeDefined();
  });

  it('allows a super-admin actor to grant any code', async () => {
    roles.findOne.mockResolvedValue(null);
    permissions.find.mockResolvedValue(permissionsList);
    roles.create.mockImplementation((value) => value as Role);
    roles.save.mockImplementation(async (value) => ({ ...role, ...value }) as Role);

    await expect(
      service.create(
        { name: 'Sales Manager', permissionCodes: ['students.read', 'crm.manage'] },
        actorWith(['*.*']),
      ),
    ).resolves.toBeDefined();
  });

  it('returns paginated roles with stats for role management page', async () => {
    roles.find.mockResolvedValue([role]);
    roles.count.mockResolvedValue(7);
    permissions.count.mockResolvedValue(968);

    const result = await service.findAll({ page: 1, limit: 20, search: 'teach' });

    expect(result.stats).toEqual({ roleCount: 7, permissionCount: 968, foundCount: 1 });
    expect(result.items[0]).toMatchObject({
      name: 'teacher',
      displayName: 'TEACHER',
      permissionCount: 2,
    });
  });

  it('updates custom role permissions', async () => {
    roles.createQueryBuilder.mockReturnValue(mockQueryBuilder(role));
    roles.findOne.mockResolvedValue(null); // ensureRoleNameIsAvailable — nom band emas
    permissions.find.mockResolvedValue([permissionsList[0]]);
    roles.save.mockImplementation(async (value) => value as Role);

    const result = await service.update(roleId, {
      name: 'Tutor',
      permissionCodes: ['students.read'],
    });

    expect(roles.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'tutor',
        permissions: [permissionsList[0]],
      }),
    );
    expect(result.displayName).toBe('TUTOR');
  });

  it('rejects updating a role to add a permission code the actor does not hold (Q2)', async () => {
    roles.createQueryBuilder.mockReturnValue(mockQueryBuilder(role));
    roles.findOne.mockResolvedValue(null);
    permissions.find.mockResolvedValue(permissionsList);

    await expect(
      service.update(
        roleId,
        { permissionCodes: ['students.read', 'crm.manage'] },
        actorWith(['students.read']),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roles.save).not.toHaveBeenCalled();
  });

  it("getPermissionCatalog `*.*` (super-admin wildcard) ni chiqarib tashlaydi", async () => {
    permissions.find.mockResolvedValue([
      { id: 'p0', code: '*.*', module: '*', action: '*' },
      permissionsList[0],
      permissionsList[1],
    ] as Permission[]);

    const catalog = await service.getPermissionCatalog();

    expect(catalog.totalPermissions).toBe(2);
    const allCodes = catalog.categories.flatMap((category) =>
      category.resources.flatMap((resource) => resource.permissions.map((permission) => permission.code)),
    );
    expect(allCodes).not.toContain('*.*');
  });

  it('does not delete system roles', async () => {
    roles.createQueryBuilder.mockReturnValue(mockQueryBuilder({ ...role, isSystem: true } as Role));

    await expect(service.remove(roleId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects updating a privileged role (director/ceo) without roles.manage-privileged', async () => {
    const privilegedRole = { ...role, name: 'director', isPrivileged: true } as Role;
    roles.createQueryBuilder.mockReturnValue(mockQueryBuilder(privilegedRole));

    await expect(
      service.update(roleId, { title: { uz: 'Yangi nom' } }, actorWith(['students.read'])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roles.save).not.toHaveBeenCalled();
  });

  it('allows updating a privileged role when actor holds roles.manage-privileged', async () => {
    const privilegedRole = { ...role, name: 'director', isPrivileged: true } as Role;
    roles.createQueryBuilder.mockReturnValue(mockQueryBuilder(privilegedRole));
    roles.save.mockImplementation(async (value) => value as Role);

    await expect(
      service.update(roleId, { title: { uz: 'Yangi nom' } }, actorWith(['roles.manage-privileged'])),
    ).resolves.toBeDefined();
  });

  it('rejects deleting a privileged role without roles.manage-privileged (even before the isSystem check)', async () => {
    const privilegedRole = { ...role, name: 'director', isPrivileged: true, isSystem: false } as Role;
    roles.createQueryBuilder.mockReturnValue(mockQueryBuilder(privilegedRole));

    await expect(service.remove(roleId, actorWith(['students.read']))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when role is missing', async () => {
    roles.createQueryBuilder.mockReturnValue(mockQueryBuilder(null));

    await expect(service.findOne(roleId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes the role lookup to global-or-own-school when a tenant context is active', async () => {
    const qb = mockQueryBuilder(role);
    roles.createQueryBuilder.mockReturnValue(qb);
    const tenant = new TenantContextService();
    service = new RolesService(
      roles as unknown as Repository<Role>,
      permissions as unknown as Repository<Permission>,
      tenant,
    );

    await tenant.run(async () => {
      tenant.set({ schoolId: 'school-1' });
      await service.findOne(roleId);
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      '(role.schoolId IS NULL OR role.schoolId = :schoolId)',
      { schoolId: 'school-1' },
    );
  });

  it('does not scope the role lookup when there is no tenant context (super-admin)', async () => {
    const qb = mockQueryBuilder(role);
    roles.createQueryBuilder.mockReturnValue(qb);

    await service.findOne(roleId);

    expect(qb.andWhere).not.toHaveBeenCalled();
  });
});
