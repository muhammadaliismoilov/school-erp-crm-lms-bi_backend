import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { LeaveService } from '../src/modules/hr/leave.service';
import { StaffLeave } from '../src/modules/hr/entities/staff-leave.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { LeaveStatus, LeaveType } from '../src/modules/hr/enums/hr.enums';

function makeLeave(overrides: Partial<StaffLeave> = {}): StaffLeave {
  return {
    id: 'lv-1',
    staffMemberId: 'staff-1',
    type: LeaveType.ANNUAL,
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    days: 5,
    reason: null,
    status: LeaveStatus.REQUESTED,
    staffMember: { firstName: 'Ali', lastName: 'Valiyev' } as StaffMember,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as StaffLeave;
}

describe('LeaveService', () => {
  let leaves: jest.Mocked<Pick<Repository<StaffLeave>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>>;
  let staff: jest.Mocked<Pick<Repository<StaffMember>, 'findOne'>>;
  let service: LeaveService;

  beforeEach(() => {
    leaves = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'lv-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    staff = { findOne: jest.fn() };
    service = new LeaveService(
      leaves as unknown as Repository<StaffLeave>,
      staff as unknown as Repository<StaffMember>,
    );
  });

  describe('createLeave', () => {
    it('computes days from the date range when days is 0 and resolves staff name', async () => {
      staff.findOne.mockResolvedValue({ id: 'staff-1' } as StaffMember);
      leaves.findOne.mockResolvedValue(makeLeave({ days: 5 }));

      const res = await service.createLeave({
        staffMemberId: 'staff-1',
        type: LeaveType.ANNUAL,
        startDate: '2026-07-01',
        endDate: '2026-07-05',
        days: 0,
      });

      const created = leaves.create.mock.calls[0][0];
      expect(created.days).toBe(5);
      expect(res.staffName).toBe('Valiyev Ali');
    });

    it('rejects an end date before the start date', async () => {
      staff.findOne.mockResolvedValue({ id: 'staff-1' } as StaffMember);
      await expect(
        service.createLeave({
          staffMemberId: 'staff-1',
          type: LeaveType.SICK,
          startDate: '2026-07-10',
          endDate: '2026-07-01',
          days: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown staff member', async () => {
      staff.findOne.mockResolvedValue(null);
      await expect(
        service.createLeave({
          staffMemberId: 'x',
          type: LeaveType.ANNUAL,
          startDate: '2026-07-01',
          endDate: '2026-07-05',
          days: 5,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reviewLeave', () => {
    it('approves a requested leave', async () => {
      leaves.findOne.mockResolvedValue(makeLeave());
      const res = await service.reviewLeave('lv-1', { status: LeaveStatus.APPROVED });
      expect(res.status).toBe('approved');
    });

    it('rejects an invalid review status', async () => {
      await expect(
        service.reviewLeave('lv-1', { status: LeaveStatus.REQUESTED }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
