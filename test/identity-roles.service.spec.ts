import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Permission } from '../src/modules/identity/entities/permission.entity';
import type { Role } from '../src/modules/identity/entities/role.entity';
import { RolesService } from '../src/modules/identity/roles.service';

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
  let roles: jest.Mocked<Pick<Repository<Role>, 'create' | 'save' | 'find' | 'findOne' | 'count' | 'softDelete'>>;
  let permissions: jest.Mocked<Pick<Repository<Permission>, 'find' | 'count'>>;
  let service: RolesService;

  beforeEach(() => {
    roles = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      softDelete: jest.fn(),
    };
    permissions = {
      find: jest.fn(),
      count: jest.fn(),
    };
    service = new RolesService(
      roles as unknown as Repository<Role>,
      permissions as unknown as Repository<Permission>,
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
    roles.findOne.mockResolvedValueOnce(role).mockResolvedValueOnce(null);
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

  it('does not delete system roles', async () => {
    roles.findOne.mockResolvedValue({ ...role, isSystem: true } as Role);

    await expect(service.remove(roleId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when role is missing', async () => {
    roles.findOne.mockResolvedValue(null);

    await expect(service.findOne(roleId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
