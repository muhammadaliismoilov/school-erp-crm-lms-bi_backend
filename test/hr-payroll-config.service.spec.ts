import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PayrollConfigService } from '../src/modules/hr/payroll-config.service';
import { PayRateCard } from '../src/modules/hr/entities/pay-rate-card.entity';
import { PayrollSettings } from '../src/modules/hr/entities/payroll-settings.entity';
import { QualificationCategory } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

/** Zanjirli QueryBuilder mock — chaqiruvlar o'z-o'zini qaytaradi. */
function makeQb(result: { one?: unknown; many?: unknown[]; count?: number }) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['where', 'andWhere', 'orderBy', 'addOrderBy', 'limit']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getOne = jest.fn().mockResolvedValue(result.one ?? null);
  qb.getMany = jest.fn().mockResolvedValue(result.many ?? []);
  qb.getCount = jest.fn().mockResolvedValue(result.count ?? 0);
  return qb;
}

describe('PayrollConfigService', () => {
  let rateCards: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    softDelete: jest.Mock;
  };
  let settings: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let service: PayrollConfigService;

  const tenant = { getSchoolId: () => null, getBranchId: () => null } as unknown as TenantContextService;

  beforeEach(() => {
    rateCards = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ ...v, id: v.id ?? 'rc-1', createdAt: new Date(), updatedAt: new Date() })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    settings = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => v),
    };
    service = new PayrollConfigService(
      rateCards as unknown as Repository<PayRateCard>,
      settings as unknown as Repository<PayrollSettings>,
      tenant,
    );
  });

  it('createRateCard — toifa+sana takrorlansa BadRequest', async () => {
    rateCards.createQueryBuilder.mockReturnValue(makeQb({ count: 1 }));
    await expect(
      service.createRateCard({ category: QualificationCategory.OLIY, ratePerLesson: 60000, effectiveFrom: '2026-09-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createRateCard — takror bo`lmasa saqlaydi va raqamni qaytaradi', async () => {
    rateCards.createQueryBuilder.mockReturnValue(makeQb({ count: 0 }));
    const res = await service.createRateCard({
      category: QualificationCategory.OLIY,
      ratePerLesson: 60000,
      effectiveFrom: '2026-09-01',
    });
    expect(res.ratePerLesson).toBe(60000);
    expect(res.category).toBe(QualificationCategory.OLIY);
    expect(rateCards.save).toHaveBeenCalled();
  });

  it('resolveRate — sana bo`yicha eng so`nggi amaldagi stavkani oladi', async () => {
    const qb = makeQb({ one: { ratePerLesson: '50000.00' } });
    rateCards.createQueryBuilder.mockReturnValue(qb);
    const rate = await service.resolveRate(QualificationCategory.BIRINCHI, '2026-10-15');
    expect(rate).toBe(50000);
    expect(qb.andWhere).toHaveBeenCalledWith('rc.effective_from <= :d', { d: '2026-10-15' });
    expect(qb.orderBy).toHaveBeenCalledWith('rc.effective_from', 'DESC');
  });

  it('resolveRate — stavka topilmasa null (dvigatel fallback qiladi)', async () => {
    rateCards.createQueryBuilder.mockReturnValue(makeQb({ one: null }));
    expect(await service.resolveRate(QualificationCategory.MUTAXASSIS, '2026-01-01')).toBeNull();
  });

  it('currentSettings — yozuv bo`lmasa default qiymatlar', async () => {
    const res = await service.currentSettings();
    expect(res).toEqual({ classLeaderRate: 0, maxClassLeaderships: 3 });
  });

  it('updateSettings — upsert qiladi va yangilangan qiymatni qaytaradi', async () => {
    settings.findOne
      .mockResolvedValueOnce(null) // update ichidagi qidiruv
      .mockResolvedValueOnce({ classLeaderRate: '600000.00', maxClassLeaderships: 3 }); // currentSettings
    const res = await service.updateSettings({ classLeaderRate: 600000 });
    expect(settings.save).toHaveBeenCalled();
    expect(res.classLeaderRate).toBe(600000);
  });
});
