import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { PayrollAdjustmentService } from '../src/modules/hr/payroll-adjustment.service';
import type { PayrollAdjustment } from '../src/modules/hr/entities/payroll-adjustment.entity';
import type { Payroll } from '../src/modules/hr/entities/payroll.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { PayrollAdjustmentType } from '../src/modules/hr/enums/hr.enums';
import type { TenantContextService } from '../src/common/tenant/tenant-context.service';

describe('PayrollAdjustmentService', () => {
  let adjustments: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    softDelete: jest.Mock;
  };
  let payrolls: { findOne: jest.Mock };
  let staff: { findOne: jest.Mock };
  let service: PayrollAdjustmentService;

  const tenant = { getSchoolId: () => null, getBranchId: () => null } as unknown as TenantContextService;

  const saved = {
    id: 'adj-1',
    staffMemberId: 's-1',
    period: '2026-07',
    type: PayrollAdjustmentType.BONUS,
    amount: '500000.00',
    reason: 'Ochiq dars tashkil etgani uchun',
    createdById: 'u-1',
    createdAt: new Date(),
    staffMember: { lastName: 'Karimov', firstName: 'Davron' },
  };

  beforeEach(() => {
    adjustments = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ ...v, id: 'adj-1' })),
      findOne: jest.fn().mockResolvedValue(saved),
      softDelete: jest.fn(),
    };
    payrolls = { findOne: jest.fn().mockResolvedValue(null) }; // davr ochiq
    staff = { findOne: jest.fn().mockResolvedValue({ id: 's-1' }) };
    service = new PayrollAdjustmentService(
      adjustments as unknown as Repository<PayrollAdjustment>,
      payrolls as unknown as Repository<Payroll>,
      staff as unknown as Repository<StaffMember>,
      tenant,
    );
  });

  it('create — davr ochiq bo‘lsa saqlaydi, createdById yozadi', async () => {
    const res = await service.create(
      { staffMemberId: 's-1', period: '2026-07', type: PayrollAdjustmentType.BONUS, amount: 500000, reason: 'Ochiq dars tashkil etgani uchun' },
      'u-1',
    );
    expect(adjustments.save).toHaveBeenCalledWith(expect.objectContaining({ createdById: 'u-1' }));
    expect(res.staffName).toBe('Karimov Davron');
    expect(res.amount).toBe(500000);
  });

  it('create — oylik tasdiqlash jarayonida bo‘lsa BadRequest (immutability)', async () => {
    payrolls.findOne.mockResolvedValue({ id: 'p-1' });
    await expect(
      service.create(
        { staffMemberId: 's-1', period: '2026-07', type: PayrollAdjustmentType.PENALTY, amount: 100000, reason: 'Kechikish' },
        'u-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create — xodim topilmasa NotFound', async () => {
    staff.findOne.mockResolvedValue(null);
    await expect(
      service.create(
        { staffMemberId: 'yo-q', period: '2026-07', type: PayrollAdjustmentType.BONUS, amount: 1, reason: 'Sabab bor' },
        'u-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update/remove — yopiq davr uchun taqiqlanadi', async () => {
    payrolls.findOne.mockResolvedValue({ id: 'p-1' });
    await expect(service.update('adj-1', { amount: 1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.remove('adj-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(adjustments.softDelete).not.toHaveBeenCalled();
  });

  it('remove — ochiq davrda soft-delete', async () => {
    await service.remove('adj-1');
    expect(adjustments.softDelete).toHaveBeenCalledWith('adj-1');
  });
});
