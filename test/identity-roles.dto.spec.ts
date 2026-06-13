import { validateDto } from '../src/common/validation/validate-dto';
import { CreateRoleDto } from '../src/modules/identity/dto/create-role.dto';
import { RoleQueryDto } from '../src/modules/identity/dto/role-query.dto';
import { UpdateRoleDto } from '../src/modules/identity/dto/update-role.dto';

describe('CreateRoleDto', () => {
  it('accepts role form payload with many permissions', async () => {
    const errors = await validateDto(CreateRoleDto, {
      name: 'Sales Manager',
      title: { uz: 'Sotuv menejeri', ru: 'Менеджер продаж', en: 'Sales Manager' },
      description: { uz: 'Sotuv bo‘limi uchun rol', ru: 'Роль отдела продаж', en: 'Sales department role' },
      permissionCodes: ['students.read', 'crm.manage', 'notifications.read'],
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts localized title/description with only uz (ru/en optional)', async () => {
    const errors = await validateDto(CreateRoleDto, {
      name: 'Sales',
      title: { uz: 'Sotuv menejeri' },
      description: { uz: 'Sotuv va CRM amallari uchun rol' },
      permissionCodes: ['crm.read', 'crm.manage', 'students.read'],
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects localized field missing the primary uz value', async () => {
    const errors = await validateDto(CreateRoleDto, {
      name: 'Sales',
      description: { ru: 'Роль' },
      permissionCodes: ['crm.read'],
    });

    expect(JSON.stringify(errors)).toContain('uz');
  });

  it('rejects invalid role form fields and unknown properties', async () => {
    const errors = await validateDto(CreateRoleDto, {
      name: '',
      permissionCodes: ['bad permission'],
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('name');
    expect(serialized).toContain('permissionCodes');
    expect(serialized).toContain('extra');
  });
});

describe('UpdateRoleDto', () => {
  it('accepts partial role update payload', async () => {
    const errors = await validateDto(UpdateRoleDto, {
      name: 'Tutor',
      permissionCodes: ['students.read'],
    });

    expect(errors).toHaveLength(0);
  });
});

describe('RoleQueryDto', () => {
  it('accepts search and pagination filters', async () => {
    const errors = await validateDto(RoleQueryDto, {
      search: 'teacher',
      page: 1,
      limit: 20,
    });

    expect(errors).toHaveLength(0);
  });
});
