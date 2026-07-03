import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { WorkScheduleService } from '../src/modules/hr/work-schedule.service';
import { WorkSchedule } from '../src/modules/hr/entities/work-schedule.entity';
import { Weekday, WorkScheduleDay } from '../src/modules/hr/entities/work-schedule-day.entity';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeSchedule(overrides: Partial<WorkSchedule> = {}): WorkSchedule {
  return {
    id: 'sch-1',
    name: 'Standart 5 kunlik',
    description: null,
    isStandard: true,
    days: [
      { weekday: Weekday.TUESDAY, startTime: '09:00:00', endTime: '18:00:00', lunchStart: '13:00:00', lunchEnd: '14:00:00' } as WorkScheduleDay,
      { weekday: Weekday.MONDAY, startTime: '09:00:00', endTime: '18:00:00', lunchStart: null, lunchEnd: null } as WorkScheduleDay,
    ],
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as WorkSchedule;
}

describe('WorkScheduleService', () => {
  let schedules: jest.Mocked<Pick<Repository<WorkSchedule>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>>;
  let days: jest.Mocked<Pick<Repository<WorkScheduleDay>, 'create' | 'save' | 'delete'>>;
  let service: WorkScheduleService;

  beforeEach(() => {
    schedules = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'sch-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    days = {
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => v),
      delete: jest.fn(),
    };
    service = new WorkScheduleService(
      schedules as unknown as Repository<WorkSchedule>,
      days as unknown as Repository<WorkScheduleDay>,
      new TenantContextService(),
    );
  });

  describe('createSchedule', () => {
    it('sorts days Monday-first and trims times to HH:mm', async () => {
      schedules.findOne.mockResolvedValue(makeSchedule());
      const res = await service.createSchedule({
        name: 'Standart 5 kunlik',
        isStandard: true,
        days: [
          { weekday: Weekday.TUESDAY, startTime: '09:00', endTime: '18:00' },
          { weekday: Weekday.MONDAY, startTime: '09:00', endTime: '18:00' },
        ],
      });
      expect(res.days[0].weekday).toBe(Weekday.MONDAY);
      expect(res.days[1].weekday).toBe(Weekday.TUESDAY);
      expect(res.days[1].lunchStart).toBe('13:00');
      expect(res.isStandard).toBe(true);
    });
  });

  describe('getSchedule', () => {
    it('throws when the schedule is missing', async () => {
      schedules.findOne.mockResolvedValue(null);
      await expect(service.getSchedule('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
