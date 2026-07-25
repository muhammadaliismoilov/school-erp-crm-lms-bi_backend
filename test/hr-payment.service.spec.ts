import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { HrPaymentService } from '../src/modules/hr/hr-payment.service';
import type { HrPayment } from '../src/modules/hr/entities/hr-payment.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { HrPaymentStatus } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makePayment(overrides: Partial<HrPayment> = {}): HrPayment {
  return {
    id: 'pay-1',
    staffMemberId: 'staff-1',
    staffMember: { firstName: 'Ali', lastName: 'Valiyev' } as StaffMember,
    amount: 4000000,
    paymentDate: '2026-06-30',
    status: HrPaymentStatus.PENDING,
    timesheetId: null,
    timesheet: null,
    note: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as HrPayment;
}

describe('HrPaymentService', () => {
  let payments: jest.Mocked<
    Pick<Repository<HrPayment>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>
  >;
  let staff: jest.Mocked<Pick<Repository<StaffMember>, 'findOne'>>;
  let service: HrPaymentService;

  beforeEach(() => {
    payments = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'pay-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    staff = { findOne: jest.fn() };
    service = new HrPaymentService(
      payments as unknown as Repository<HrPayment>,
      staff as unknown as Repository<StaffMember>,
      new TenantContextService(),
    );
  });

  describe('createPayment', () => {
    it('creates a pending payment and resolves staff name', async () => {
      staff.findOne.mockResolvedValue({ id: 'staff-1' } as StaffMember);
      payments.findOne.mockResolvedValue(makePayment());
      const res = await service.createPayment({ staffMemberId: 'staff-1', amount: 4000000 });
      expect(res.status).toBe(HrPaymentStatus.PENDING);
      expect(res.staffName).toBe('Valiyev Ali');
      expect(res.amount).toBe(4000000);
    });

    it('rejects an unknown staff member', async () => {
      staff.findOne.mockResolvedValue(null);
      await expect(
        service.createPayment({ staffMemberId: 'x', amount: 100 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('marks the payment as paid', async () => {
      payments.findOne
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment({ status: HrPaymentStatus.PAID }));
      const res = await service.updateStatus('pay-1', { status: HrPaymentStatus.PAID });
      expect(res.status).toBe(HrPaymentStatus.PAID);
    });
  });
});
