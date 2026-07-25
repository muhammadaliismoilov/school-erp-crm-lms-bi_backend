import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { TimesheetService } from '../src/modules/hr/timesheet.service';
import type { Timesheet } from '../src/modules/hr/entities/timesheet.entity';
import type { TimesheetLine } from '../src/modules/hr/entities/timesheet-line.entity';
import { TimesheetStatus } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeTimesheet(overrides: Partial<Timesheet> = {}): Timesheet {
  return {
    id: 'ts-1',
    year: 2026,
    month: 6,
    departmentId: null,
    department: null,
    status: TimesheetStatus.DRAFT,
    submittedAt: null,
    approvedAt: null,
    note: null,
    lines: [],
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Timesheet;
}

describe('TimesheetService', () => {
  let timesheets: jest.Mocked<
    Pick<Repository<Timesheet>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>
  >;
  let lines: jest.Mocked<Pick<Repository<TimesheetLine>, 'create' | 'save' | 'delete'>>;
  let service: TimesheetService;

  beforeEach(() => {
    timesheets = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'ts-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    lines = {
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => v),
      delete: jest.fn(),
    };
    service = new TimesheetService(
      timesheets as unknown as Repository<Timesheet>,
      lines as unknown as Repository<TimesheetLine>,
      new TenantContextService(),
    );
  });

  describe('createTimesheet', () => {
    it('rejects a duplicate period for the same department', async () => {
      timesheets.findOne.mockResolvedValue(makeTimesheet());
      await expect(
        service.createTimesheet({ year: 2026, month: 6 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a draft when no duplicate exists', async () => {
      timesheets.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeTimesheet());
      const res = await service.createTimesheet({ year: 2026, month: 6 });
      expect(res.status).toBe(TimesheetStatus.DRAFT);
    });
  });

  describe('approveTimesheet', () => {
    it('refuses to approve a draft directly', async () => {
      timesheets.findOne.mockResolvedValue(makeTimesheet());
      await expect(service.approveTimesheet('ts-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approves a submitted timesheet', async () => {
      timesheets.findOne
        .mockResolvedValueOnce(makeTimesheet({ status: TimesheetStatus.SUBMITTED }))
        .mockResolvedValueOnce(makeTimesheet({ status: TimesheetStatus.APPROVED }));
      const res = await service.approveTimesheet('ts-1');
      expect(res.status).toBe(TimesheetStatus.APPROVED);
    });

    it('throws for a missing timesheet', async () => {
      timesheets.findOne.mockResolvedValue(null);
      await expect(service.approveTimesheet('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
