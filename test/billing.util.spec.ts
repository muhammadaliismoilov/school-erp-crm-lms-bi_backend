import {
  balanceStatus,
  computeStudentBalance,
  effectiveMonthlyFee,
  monthsBilled,
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
});
