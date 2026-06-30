import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { PositionService } from '../src/modules/hr/position.service';
import { Position, PositionStatus } from '../src/modules/hr/entities/position.entity';
import type { Department } from '../src/modules/hr/entities/department.entity';
import type { Branch } from '../src/modules/settings/entities/branch.entity';

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    id: 'pos-1',
    title: 'Zavuch',
    code: 'zavuch',
    description: null,
    baseSalary: 0,
    departmentId: null,
    filialId: null,
    status: PositionStatus.ACTIVE,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Position;
}

describe('PositionService', () => {
  let positions: jest.Mocked<Pick<Repository<Position>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>>;
  let departments: jest.Mocked<Pick<Repository<Department>, 'findOne'>>;
  let branches: jest.Mocked<Pick<Repository<Branch>, 'findOne'>>;
  let service: PositionService;

  beforeEach(() => {
    positions = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'pos-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    departments = { findOne: jest.fn() };
    branches = { findOne: jest.fn() };
    const schools = { findOne: jest.fn() };
    service = new PositionService(
      positions as unknown as Repository<Position>,
      departments as unknown as Repository<Department>,
      branches as unknown as Repository<Branch>,
      schools as never,
    );
  });

  describe('createPosition', () => {
    it('auto-generates a slug code and resolves the department name', async () => {
      departments.findOne.mockResolvedValue({ id: 'dep-1' } as Department);
      // resolveCode -> findOne(code) null; getPosition -> findOne(id) entity
      positions.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makePosition({ department: { name: 'Oquv bo‘limi' } as Department, departmentId: 'dep-1' }));

      const res = await service.createPosition({ title: 'Bosh hisobchi', departmentId: 'dep-1' });

      const created = positions.create.mock.calls[0][0];
      expect(created.code).toBe('bosh_hisobchi');
      expect(res.departmentName).toBe('Oquv bo‘limi');
    });

    it('rejects an unknown department', async () => {
      departments.findOne.mockResolvedValue(null);
      await expect(
        service.createPosition({ title: 'Test', departmentId: '11111111-1111-1111-1111-111111111111' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removePosition', () => {
    it('soft-deletes the position', async () => {
      positions.findOne.mockResolvedValue(makePosition());
      await service.removePosition('pos-1');
      expect(positions.softDelete).toHaveBeenCalledWith('pos-1');
    });
  });
});
