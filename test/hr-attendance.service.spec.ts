import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AttendanceHrService } from '../src/modules/hr/attendance-hr.service';
import { AttendanceRecord } from '../src/modules/hr/entities/attendance-record.entity';
import type { Geofence } from '../src/modules/hr/entities/geofence.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { AttendanceAction, AttendanceReviewStatus } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: 'att-1',
    staffMemberId: 'staff-1',
    action: AttendanceAction.CHECK_IN,
    recordedAt: new Date('2026-06-19T09:00:00Z'),
    latitude: 41.31,
    longitude: 69.24,
    geofenceId: null,
    deviceInfo: null,
    status: AttendanceReviewStatus.PENDING,
    staffMember: { firstName: 'Ali', lastName: 'Valiyev' } as StaffMember,
    createdAt: new Date('2026-06-19T09:00:00Z'),
    updatedAt: new Date('2026-06-19T09:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as AttendanceRecord;
}

describe('AttendanceHrService', () => {
  let records: jest.Mocked<Pick<Repository<AttendanceRecord>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>>;
  let geofences: jest.Mocked<Pick<Repository<Geofence>, 'find' | 'findOne' | 'create' | 'save'>>;
  let staff: jest.Mocked<Pick<Repository<StaffMember>, 'findOne'>>;
  let service: AttendanceHrService;

  beforeEach(() => {
    records = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'att-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    geofences = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    staff = { findOne: jest.fn() };
    service = new AttendanceHrService(
      records as unknown as Repository<AttendanceRecord>,
      geofences as unknown as Repository<Geofence>,
      staff as unknown as Repository<StaffMember>,
      new TenantContextService(),
    );
  });

  describe('createRecord', () => {
    it('creates a pending check-in and resolves the staff name', async () => {
      staff.findOne.mockResolvedValue({ id: 'staff-1' } as StaffMember);
      records.findOne.mockResolvedValue(makeRecord());

      const res = await service.createRecord({ staffMemberId: 'staff-1', action: AttendanceAction.CHECK_IN });

      const created = records.create.mock.calls[0][0];
      expect(created.status).toBe(AttendanceReviewStatus.PENDING);
      expect(created.action).toBe(AttendanceAction.CHECK_IN);
      expect(res.staffName).toBe('Valiyev Ali');
    });

    it('rejects an unknown staff member', async () => {
      staff.findOne.mockResolvedValue(null);
      await expect(
        service.createRecord({ staffMemberId: 'x', action: AttendanceAction.CHECK_OUT }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unknown geofence', async () => {
      staff.findOne.mockResolvedValue({ id: 'staff-1' } as StaffMember);
      geofences.findOne.mockResolvedValue(null);
      await expect(
        service.createRecord({
          staffMemberId: 'staff-1',
          action: AttendanceAction.CHECK_IN,
          geofenceId: '11111111-1111-1111-1111-111111111111',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reviewRecord', () => {
    it('approves a pending record', async () => {
      records.findOne.mockResolvedValue(makeRecord());
      const res = await service.reviewRecord('att-1', { status: AttendanceReviewStatus.APPROVED });
      expect(res.status).toBe('approved');
    });

    it('rejects an invalid review status', async () => {
      await expect(
        service.reviewRecord('att-1', { status: AttendanceReviewStatus.PENDING }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
