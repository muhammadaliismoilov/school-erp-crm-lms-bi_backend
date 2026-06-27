import {
  balanceStatus,
  buildInstallmentSchedule,
  comparePlans,
  computePlanBalance,
  computeStudentBalance,
  effectiveMonthlyFee,
  expectedToDate,
  monthSpanInclusive,
  monthsBilled,
  PlanConfig,
  resolvePlanDiscount,
  validatePlanRates,
} from '../src/modules/student-payments/billing.util';

describe('billing.util', () => {
  describe('effectiveMonthlyFee', () => {
    it('foiz chegirma: 2 050 000 − 10% = 1 845 000', () => {
      expect(effectiveMonthlyFee(2050000, 'percent', 10)).toBe(1845000);
    });

    it('so‘m chegirma: 2 050 000 − 200 000 = 1 850 000', () => {
      expect(effectiveMonthlyFee(2050000, 'amount', 200000)).toBe(1850000);
    });

    it('chegirma tarifdan katta bo‘lsa 0 (manfiy bo‘lmaydi)', () => {
      expect(effectiveMonthlyFee(100000, 'amount', 500000)).toBe(0);
      expect(effectiveMonthlyFee(100000, 'percent', 150)).toBe(0);
    });

    it('chegirmasiz tarifni o‘zini qaytaradi', () => {
      expect(effectiveMonthlyFee(2050000, 'percent', 0)).toBe(2050000);
    });
  });

  describe('monthsBilled', () => {
    const now = new Date('2026-06-15T00:00:00Z');

    it('shu oy qo‘shilsa 1 oy', () => {
      expect(monthsBilled('2026-06-01', now)).toBe(1);
    });

    it('3 oy oldin qo‘shilsa 4 oy (ikkala chet ham)', () => {
      expect(monthsBilled('2026-03-10', now)).toBe(4);
    });

    it('o‘tgan yildan hisoblaydi', () => {
      expect(monthsBilled('2025-12-01', now)).toBe(7);
    });

    it('kelajak sana → 0', () => {
      expect(monthsBilled('2026-09-01', now)).toBe(0);
    });
  });

  describe('balanceStatus', () => {
    it('manfiy → qarzdor', () => {
      expect(balanceStatus(-1845000)).toBe('debtor');
    });
    it('musbat → avans', () => {
      expect(balanceStatus(500000)).toBe('advance');
    });
    it('nol (±1 tolerans) → teng', () => {
      expect(balanceStatus(0)).toBe('settled');
      expect(balanceStatus(0.5)).toBe('settled');
    });
  });

  describe('computeStudentBalance', () => {
    const now = new Date('2026-07-15T00:00:00Z');

    it('2 oy, 10% chegirma, to‘liq oylik to‘lagan → qarz', () => {
      const r = computeStudentBalance(
        { monthlyFee: 2050000, discountType: 'percent', discountValue: 10, billingStart: '2026-06-01', paid: 1845000 },
        now,
      );
      expect(r.effectiveMonthly).toBe(1845000);
      expect(r.months).toBe(2);
      expect(r.expected).toBe(3690000);
      expect(r.balance).toBe(-1845000);
      expect(r.status).toBe('debtor');
    });

    it('ortiqcha to‘lov → avans', () => {
      const r = computeStudentBalance(
        { monthlyFee: 1000000, discountType: 'percent', discountValue: 0, billingStart: '2026-07-01', paid: 1500000 },
        now,
      );
      expect(r.expected).toBe(1000000);
      expect(r.balance).toBe(500000);
      expect(r.status).toBe('advance');
    });

    it('aniq to‘langan → teng', () => {
      const r = computeStudentBalance(
        { monthlyFee: 1000000, discountType: 'percent', discountValue: 0, billingStart: '2026-07-01', paid: 1000000 },
        now,
      );
      expect(r.status).toBe('settled');
    });
  });

  // ── To'lov rejasi (payment plan) chegirmasi ──────────────────────────────

  // User misoli: oylik 1 000 000, akademik yil sen–iyun = 10 oy.
  const config: PlanConfig = {
    referenceMonthlyFee: 1000000,
    rates: [
      { planCode: 'yearly_1x', discountType: 'amount', discountValue: 2000000 },
      { planCode: 'split_2', discountType: 'amount', discountValue: 1300000 },
      { planCode: 'split_3', discountType: 'amount', discountValue: 600000 },
      { planCode: 'monthly', discountType: 'amount', discountValue: 0 },
    ],
  };

  describe('monthSpanInclusive', () => {
    it('sentabr–iyun = 10 oy (ikkala chet)', () => {
      expect(monthSpanInclusive('2025-09-01', '2026-06-30')).toBe(10);
    });
    it('noyabr–iyun = 8 oy', () => {
      expect(monthSpanInclusive('2025-11-01', '2026-06-30')).toBe(8);
    });
    it('teskari → 0', () => {
      expect(monthSpanInclusive('2026-06-01', '2025-09-01')).toBe(0);
    });
  });

  describe('resolvePlanDiscount', () => {
    it('so‘m: qat‘iy qiymat', () => {
      expect(resolvePlanDiscount(10000000, { planCode: 'yearly_1x', discountType: 'amount', discountValue: 2000000 })).toBe(2000000);
    });
    it('so‘m + prorate 0.8 → 1 600 000', () => {
      expect(resolvePlanDiscount(8000000, { planCode: 'yearly_1x', discountType: 'amount', discountValue: 2000000 }, 0.8)).toBe(1600000);
    });
    it('foiz: bazadan olinadi (proratlash avtomatik)', () => {
      expect(resolvePlanDiscount(8000000, { planCode: 'split_3', discountType: 'percent', discountValue: 10 })).toBe(800000);
    });
    it('chegirma bazadan oshmaydi', () => {
      expect(resolvePlanDiscount(500000, { planCode: 'yearly_1x', discountType: 'amount', discountValue: 2000000 })).toBe(500000);
    });
  });

  describe('validatePlanRates', () => {
    it('to‘g‘ri tartib → ok', () => {
      expect(validatePlanRates(config).ok).toBe(true);
    });
    it('invariant buzilsa → violation', () => {
      const bad: PlanConfig = {
        referenceMonthlyFee: 1000000,
        rates: [
          { planCode: 'yearly_1x', discountType: 'amount', discountValue: 500000 },
          { planCode: 'split_2', discountType: 'amount', discountValue: 1300000 },
          { planCode: 'split_3', discountType: 'amount', discountValue: 600000 },
          { planCode: 'monthly', discountType: 'amount', discountValue: 0 },
        ],
      };
      const r = validatePlanRates(bad);
      expect(r.ok).toBe(false);
      expect(r.violations.length).toBeGreaterThan(0);
    });
  });

  describe('buildInstallmentSchedule', () => {
    it('yearly_1x → 1 bo‘lim, jami summa', () => {
      const s = buildInstallmentSchedule({ planCode: 'yearly_1x', total: 8000000, effectiveStart: '2025-09-01', billedMonths: 10 });
      expect(s).toHaveLength(1);
      expect(s[0]).toMatchObject({ seq: 1, dueDate: '2025-09-01', amount: 8000000 });
    });

    it('split_2 → 2 teng bo‘lim, sentabr va fevral', () => {
      const s = buildInstallmentSchedule({ planCode: 'split_2', total: 8700000, effectiveStart: '2025-09-01', billedMonths: 10 });
      expect(s).toHaveLength(2);
      expect(s[0].dueDate).toBe('2025-09-01');
      expect(s[1].dueDate).toBe('2026-02-01');
      expect(s[0].amount + s[1].amount).toBe(8700000);
    });

    it('split_3 → 3 bo‘lim, yaxlitlash oxirgiga', () => {
      const s = buildInstallmentSchedule({ planCode: 'split_3', total: 9400000, effectiveStart: '2025-09-01', billedMonths: 10 });
      expect(s).toHaveLength(3);
      expect(s.reduce((a, i) => a + i.amount, 0)).toBe(9400000);
    });

    it('monthly → har oy bitta bo‘lim', () => {
      const s = buildInstallmentSchedule({ planCode: 'monthly', total: 10000000, effectiveStart: '2025-09-01', billedMonths: 10 });
      expect(s).toHaveLength(10);
      expect(s.reduce((a, i) => a + i.amount, 0)).toBe(10000000);
    });

    it('split_3 lekin 2 oy qoldi → bo‘lim soni qisqaradi', () => {
      const s = buildInstallmentSchedule({ planCode: 'split_3', total: 2000000, effectiveStart: '2026-05-01', billedMonths: 2 });
      expect(s).toHaveLength(2);
    });
  });

  describe('comparePlans', () => {
    const academic = { academicStart: '2025-09-01', academicEnd: '2026-06-30' };

    it('to‘liq yil: yutuq 2M / 1.3M / 600k / 0', () => {
      const rows = comparePlans(
        { monthlyFee: 1000000, discountType: 'percent', discountValue: 0, billingStart: '2025-09-01', ...academic },
        config,
      );
      const byCode = Object.fromEntries(rows.map((r) => [r.planCode, r]));
      expect(byCode.yearly_1x.total).toBe(8000000);
      expect(byCode.yearly_1x.savingsVsMonthly).toBe(2000000);
      expect(byCode.split_2.savingsVsMonthly).toBe(1300000);
      expect(byCode.split_3.savingsVsMonthly).toBe(600000);
      expect(byCode.monthly.savingsVsMonthly).toBe(0);
      expect(byCode.yearly_1x.isCheapest).toBe(true);
      // Yutuq foizi = yutuq / etalon (oyma-oy) summa: 2M/10M = 20% va h.k.
      expect(byCode.yearly_1x.savingsPercent).toBe(20);
      expect(byCode.split_2.savingsPercent).toBe(13);
      expect(byCode.split_3.savingsPercent).toBe(6);
      expect(byCode.monthly.savingsPercent).toBe(0);
    });

    it('foiz reja chegirmasi: 10% → yillik umumiy summaning aniq 10% yutuq', () => {
      const percentConfig: PlanConfig = {
        referenceMonthlyFee: 1000000,
        rates: [
          { planCode: 'yearly_1x', discountType: 'percent', discountValue: 10 },
          { planCode: 'split_2', discountType: 'percent', discountValue: 6 },
          { planCode: 'split_3', discountType: 'percent', discountValue: 3 },
          { planCode: 'monthly', discountType: 'percent', discountValue: 0 },
        ],
      };
      const rows = comparePlans(
        { monthlyFee: 1000000, discountType: 'percent', discountValue: 0, billingStart: '2025-09-01', ...academic },
        percentConfig,
      );
      const yearly = rows.find((r) => r.planCode === 'yearly_1x')!;
      // Yillik baza 10M, 10% = 1M yutuq, foiz aniq 10%.
      expect(yearly.savingsVsMonthly).toBe(1000000);
      expect(yearly.savingsPercent).toBe(10);
      expect(yearly.total).toBe(9000000);
    });

    it('noyabrda qo‘shildi: baza va so‘m chegirma proratlanadi (0.8)', () => {
      const rows = comparePlans(
        { monthlyFee: 1000000, discountType: 'percent', discountValue: 0, billingStart: '2025-11-01', ...academic },
        config,
      );
      const yearly = rows.find((r) => r.planCode === 'yearly_1x')!;
      expect(yearly.total).toBe(6400000); // 8M baza − 1.6M chegirma
      expect(yearly.savingsVsMonthly).toBe(1600000);
    });

    it('individual chegirma reja chegirmasidan OLDIN qo‘llanadi', () => {
      // oylik 1M, individual 10% → effMonthly 900k → yillik baza 9M
      const rows = comparePlans(
        { monthlyFee: 1000000, discountType: 'percent', discountValue: 10, billingStart: '2025-09-01', ...academic },
        config,
      );
      const yearly = rows.find((r) => r.planCode === 'yearly_1x')!;
      expect(yearly.total).toBe(7000000); // 9M − 2M reja chegirma
    });

    it('monotonic clamp: foiz inversiyani tuzatadi', () => {
      const bad: PlanConfig = {
        referenceMonthlyFee: 1000000,
        rates: [
          { planCode: 'yearly_1x', discountType: 'amount', discountValue: 100000 },
          { planCode: 'split_2', discountType: 'percent', discountValue: 50 }, // 50% = 5M >> 100k
          { planCode: 'split_3', discountType: 'amount', discountValue: 600000 },
          { planCode: 'monthly', discountType: 'amount', discountValue: 0 },
        ],
      };
      const rows = comparePlans(
        { monthlyFee: 1000000, discountType: 'percent', discountValue: 0, billingStart: '2025-09-01', ...academic },
        bad,
      );
      const split2 = rows.find((r) => r.planCode === 'split_2')!;
      expect(split2.clamped).toBe(true);
      expect(split2.discount).toBeLessThan(rows.find((r) => r.planCode === 'yearly_1x')!.discount);
    });
  });

  describe('expectedToDate', () => {
    const schedule = [
      { seq: 1, dueDate: '2025-09-01', amount: 4000000 },
      { seq: 2, dueDate: '2026-02-01', amount: 4000000 },
    ];
    it('faqat muddati kelgan bo‘limlar', () => {
      expect(expectedToDate(schedule, new Date('2025-10-15T00:00:00Z'))).toBe(4000000);
      expect(expectedToDate(schedule, new Date('2026-03-01T00:00:00Z'))).toBe(8000000);
      expect(expectedToDate(schedule, new Date('2025-08-01T00:00:00Z'))).toBe(0);
    });
  });

  describe('computePlanBalance', () => {
    const academic = { academicStart: '2025-09-01', academicEnd: '2026-06-30' };

    it('yearly_1x: 1 marta 8M to‘langan, sentabrda → balans 0', () => {
      const r = computePlanBalance(
        {
          monthlyFee: 1000000,
          discountType: 'percent',
          discountValue: 0,
          billingStart: '2025-09-01',
          ...academic,
          planCode: 'yearly_1x',
          paid: 8000000,
        },
        config,
        new Date('2025-09-15T00:00:00Z'),
      );
      expect(r.planTotal).toBe(8000000);
      expect(r.expected).toBe(8000000);
      expect(r.status).toBe('settled');
    });

    it('yearly_1x: hali to‘lamagan → qarz = jami', () => {
      const r = computePlanBalance(
        {
          monthlyFee: 1000000,
          discountType: 'percent',
          discountValue: 0,
          billingStart: '2025-09-01',
          ...academic,
          planCode: 'yearly_1x',
          paid: 0,
        },
        config,
        new Date('2025-09-15T00:00:00Z'),
      );
      expect(r.balance).toBe(-8000000);
      expect(r.status).toBe('debtor');
    });
  });
});
