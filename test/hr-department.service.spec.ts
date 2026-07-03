import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { DepartmentService } from '../src/modules/hr/department.service';
import { Department, DepartmentStatus } from '../src/modules/hr/entities/department.entity';
import type { Branch } from '../src/modules/settings/entities/branch.entity';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeDept(overrides: Partial<Department> = {}): Department {
  return {
    id: 'dep-1',
    name: 'Oquv bo‘limi',
    code: 'oquv_bolimi',
    description: null,
    filialId: null,
    parentId: null,
    telegramChatId: null,
    status: DepartmentStatus.ACTIVE,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Department;
}

describe('DepartmentService', () => {
  let departments: jest.Mocked<Pick<Repository<Department>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>>;
  let branches: jest.Mocked<Pick<Repository<Branch>, 'find' | 'findOne'>>;
  let schools: { findOne: jest.Mock };
  let service: DepartmentService;

  beforeEach(() => {
    departments = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'dep-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    branches = { find: jest.fn(), findOne: jest.fn() };
    schools = { findOne: jest.fn() };

    service = new DepartmentService(
      departments as unknown as Repository<Department>,
      branches as unknown as Repository<Branch>,
      schools as never,
      new TenantContextService(),
    );
  });

  describe('createDepartment', () => {
    it('auto-generates a slug code from the name when none is given', async () => {
      // resolveCode: findOne(code) -> null (noyob); getDepartment: findOne(id) -> entity.
      departments.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeDept());

      await service.createDepartment({ name: 'Oquv bo‘limi' });

      const created = departments.create.mock.calls[0][0];
      expect(created.code).toBe('oquv_bo_limi');
      expect(created.status).toBe(DepartmentStatus.ACTIVE);
    });

    it('rejects an unknown filial', async () => {
      branches.findOne.mockResolvedValue(null);
      await expect(
        service.createDepartment({ name: 'Test', filialId: '11111111-1111-1111-1111-111111111111' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateDepartment', () => {
    it('rejects setting a department as its own parent', async () => {
      departments.findOne.mockResolvedValue(makeDept());
      await expect(
        service.updateDepartment('dep-1', { parentId: 'dep-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('branchOptions', () => {
    it('builds a "School , Branch" label', async () => {
      branches.find.mockResolvedValue([
        {
          id: 'b-1',
          name: { uz: 'Gurlan', ru: 'Гурлен', en: 'Gurlan' },
          school: { name: { uz: 'Yuton School', ru: 'Yuton School', en: 'Yuton School' } },
        } as unknown as Branch,
      ]);

      const options = await service.branchOptions();
      expect(options).toEqual([{ id: 'b-1', label: 'Yuton School , Gurlan' }]);
    });
  });
});
