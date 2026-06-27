import {
  aggregateMonth,
  buildMonthAxis,
  buildStudentCells,
  cellStatus,
  DebtCell,
  MonthKey,
  monthKeyStr,
  summarizeStudent,
} from '../src/modules/student-payments/debts.util';

describe('debts.util', () => {
  describe('buildMonthAxis', () => {
    it('sentabr–iyun = 10 oy (ikkala chet)', () => {
      const axis = buildMonthAxis('2025-09-01', '2026-06-30');
      expect(axis).toHaveLength(10);
      expect(axis[0]).toEqual({ year: 2025, month: 9 });
      expect(axis[9]).toEqual({ year: 2026, month: 6 });
    });

    it('yil chegarasidan o‘tadi', () => {
      const axis = buildMonthAxis('2025-11-01', '2026-02-28');
      expect(axis.map((a) => a.month)).toEqual([11, 12, 1, 2]);
    });

    it('bitta oy', () => {
      expect(buildMonthAxis('2025-09-01', '2025-09-30')).toEqual([{ year: 2025, month: 9 }]);
    });

    it('noto‘g‘ri sana → bo‘sh', () => {
      expect(buildMonthAxis('xxx', '2026-06-30')).toEqual([]);
    });
  });

  describe('cellStatus', () => {
    it('to‘liq to‘langan', () => expect(cellStatus(1000000, 1000000)).toBe('paid'));
    it('qisman', () => expect(cellStatus(1000000, 400000)).toBe('partial'));
    it('to‘lanmagan', () => expect(cellStatus(1000000, 0)).toBe('pending'));
    it('1 so‘m tolerans → paid', () => expect(cellStatus(1000000, 999999.5)).toBe('paid'));
    it('kutilgan 0, to‘lov bor → paid', () => expect(cellStatus(0, 5000)).toBe('paid'));
    it('kutilgan 0, to‘lov yo‘q → pending', () => expect(cellStatus(0, 0)).toBe('pending'));
  });

  describe('buildStudentCells', () => {
    const axis: MonthKey[] = buildMonthAxis('2025-09-01', '2025-11-30');
    // now = 2025-10-15 → sentabr/oktabr muddati kelgan, noyabr kelmagan.
    const now = new Date('2025-10-15T00:00:00Z');

    it('due bayrog‘i now bo‘yicha to‘g‘ri', () => {
      const cells = buildStudentCells(axis, () => ({ expected: 1000000, paid: 0, discount: 0 }), now);
      expect(cells.map((c) => c.due)).toEqual([true, true, false]);
    });

    it('status va summalar map‘dan keladi', () => {
      const paid: Record<string, number> = { '2025-09': 1000000, '2025-10': 300000 };
      const cells = buildStudentCells(
        axis,
        (k) => ({ expected: 1000000, paid: paid[monthKeyStr(k)] ?? 0, discount: 200000 }),
        now,
      );
      expect(cells[0].status).toBe('paid');
      expect(cells[1].status).toBe('partial');
      expect(cells[2].status).toBe('pending');
      expect(cells[0].discount).toBe(200000);
    });
  });

  describe('summarizeStudent', () => {
    const now = new Date('2025-12-15T00:00:00Z');
    const axis = buildMonthAxis('2025-09-01', '2025-12-31'); // 4 oy, hammasi muddati kelgan

    it('kam to‘lov → ota-ona qarzi', () => {
      const cells = buildStudentCells(axis, () => ({ expected: 1000000, paid: 0, discount: 0 }), now);
      const s = summarizeStudent(cells);
      expect(s.parentOwes).toBe(4000000);
      expect(s.schoolOwes).toBe(0);
      expect(s.realBalance).toBe(-4000000);
    });

    it('ortiqcha to‘lov → maktab qarzi (avans)', () => {
      const cells = buildStudentCells(
        axis,
        (k) => ({ expected: 1000000, paid: k.month === 9 ? 5000000 : 1000000, discount: 0 }),
        now,
      );
      const s = summarizeStudent(cells);
      expect(s.schoolOwes).toBe(4000000); // sentabrda 4M ortiqcha
      expect(s.parentOwes).toBe(0);
      expect(s.realBalance).toBe(4000000);
    });

    it('kelajak oy hisobga olinmaydi', () => {
      const future = buildMonthAxis('2025-09-01', '2026-06-30');
      const now2 = new Date('2025-10-15T00:00:00Z');
      const cells = buildStudentCells(future, () => ({ expected: 1000000, paid: 0, discount: 0 }), now2);
      // faqat sen+okt muddati kelgan → 2M qarz
      expect(summarizeStudent(cells).parentOwes).toBe(2000000);
    });

    it('muddati kelmagan oyga to‘lov → avans (maktab qarzi)', () => {
      const future = buildMonthAxis('2026-09-01', '2027-06-30');
      const now3 = new Date('2026-06-27T00:00:00Z'); // hali yil boshlanmagan
      // Sentyabrga 5M oldindan to'lagan, qolgan oylar 0
      const cells = buildStudentCells(
        future,
        (k) => ({ expected: 1000000, paid: k.month === 9 ? 5000000 : 0, discount: 0 }),
        now3,
      );
      const s = summarizeStudent(cells);
      expect(s.schoolOwes).toBe(5000000); // avans
      expect(s.parentOwes).toBe(0); // hech oy muddati kelmagan
      expect(s.realBalance).toBe(5000000);
    });
  });

  describe('aggregateMonth', () => {
    const key: MonthKey = { year: 2025, month: 9 };
    const mk = (expected: number, paid: number): DebtCell => ({
      year: 2025,
      month: 9,
      expected,
      paid,
      discount: 0,
      due: true,
      status: paid >= expected - 1 ? 'paid' : paid > 0 ? 'partial' : 'pending',
    });

    it('summalar va sanoqlar', () => {
      const cells = [mk(1000000, 1000000), mk(1000000, 400000), mk(1000000, 0)];
      const agg = aggregateMonth(key, cells);
      expect(agg.expected).toBe(3000000);
      expect(agg.collected).toBe(1400000);
      expect(agg.remaining).toBe(1600000);
      expect(agg.fullyPaid).toBe(1);
      expect(agg.partiallyPaid).toBe(1);
      expect(agg.unpaid).toBe(1);
      expect(Math.round(agg.collectionRate)).toBe(47); // 1.4M/3M
    });

    it('kutilgan 0 oy → foiz 0, sanoqqa kirmaydi', () => {
      const agg = aggregateMonth(key, [mk(0, 0)]);
      expect(agg.collectionRate).toBe(0);
      expect(agg.fullyPaid + agg.partiallyPaid + agg.unpaid).toBe(0);
    });
  });
});
