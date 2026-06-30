import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { BranchService } from '../src/modules/hr/branch.service';
import type { Branch } from '../src/modules/settings/entities/branch.entity';
import type { School } from '../src/modules/settings/entities/school.entity';

function makeBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 'b-1',
    schoolId: null,
    parentId: null,
    name: { uz: 'Yangibozor', ru: 'Yangibozor', en: 'Yangibozor' },
    isHeadOffice: false,
    isActive: true,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Branch;
}

describe('BranchService', () => {
  let branches: jest.Mocked<Pick<Repository<Branch>, 'find' | 'findOne' | 'create' | 'save' | 'softDelete'>>;
  let schools: jest.Mocked<Pick<Repository<School>, 'findOne'>>;
  let service: BranchService;

  beforeEach(() => {
    branches = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'b-1', ...v })),
      softDelete: jest.fn(),
    };
    schools = { findOne: jest.fn() };
    service = new BranchService(
      branches as unknown as Repository<Branch>,
      schools as unknown as Repository<School>,
    );
  });

  describe('createBranch', () => {
    it('stores the name as localized text and returns a node', async () => {
      branches.findOne.mockResolvedValue(makeBranch({ name: { uz: 'Yangi filial', ru: 'Yangi filial', en: 'Yangi filial' } }));
      const node = await service.createBranch({ name: 'Yangi filial', isHeadOffice: true });
      const created = branches.create.mock.calls[0][0];
      expect(created.name).toEqual({ uz: 'Yangi filial', ru: 'Yangi filial', en: 'Yangi filial' });
      expect(node.name).toBe('Yangi filial');
    });
  });

  describe('updateBranch', () => {
    it('rejects setting a branch as its own parent', async () => {
      branches.findOne.mockResolvedValue(makeBranch());
      await expect(service.updateBranch('b-1', { parentId: 'b-1' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findBranches', () => {
    it('builds a tree of roots with nested children', async () => {
      branches.find.mockResolvedValue([
        makeBranch({ id: 'root', name: { uz: 'Bosh', ru: 'Bosh', en: 'Bosh' } }),
        makeBranch({ id: 'child', parentId: 'root', name: { uz: 'Bola', ru: 'Bola', en: 'Bola' } }),
      ]);
      const res = await service.findBranches({ page: 1, limit: 20 });
      expect(res.meta.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].id).toBe('root');
      expect(res.items[0].children).toHaveLength(1);
      expect(res.items[0].children[0].id).toBe('child');
    });

    it('prefixes the school name in the label when present', async () => {
      branches.find.mockResolvedValue([
        makeBranch({
          id: 'root',
          name: { uz: 'Gurlan', ru: 'Gurlan', en: 'Gurlan' },
          school: { name: { uz: 'Yuton School', ru: 'Yuton School', en: 'Yuton School' } },
        } as unknown as Branch),
      ]);
      const res = await service.findBranches({ page: 1, limit: 20 });
      expect(res.items[0].name).toBe('Yuton School , Gurlan');
    });
  });
});
