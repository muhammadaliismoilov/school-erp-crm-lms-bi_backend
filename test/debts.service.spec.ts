import { DebtsService } from '../src/modules/student-payments/debts.service';
import type { PlanConfig } from '../src/modules/student-payments/billing.util';

/** Chainable query-builder mock — getMany/getRawMany/getRawOne natijasini qaytaradi. */
function qbMock(result: unknown[], raw = false, earliest = '2020-09-01') {
  const qb: Record<string, unknown> = {};
  for (const m of ['leftJoinAndSelect', 'where', 'andWhere', 'select', 'addSelect', 'groupBy', 'addGroupBy', 'orderBy']) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getMany = jest.fn(async () => result);
  qb.getRawMany = jest.fn(async () => (raw ? result : []));
  // resolveAxis MIN(COALESCE(billing_start_date, created_at)) — akademik o'qi boshi.
  qb.getRawOne = jest.fn(async () => ({ earliest }));
  return qb;
}

const config: PlanConfig = {
  referenceMonthlyFee: 1000000,
  rates: [
    { planCode: 'yearly_1x', discountType: 'percent', discountValue: 10 },
    { planCode: 'split_2', discountType: 'percent', discountValue: 7 },
    { planCode: 'split_3', discountType: 'percent', discountValue: 4 },
    { planCode: 'monthly', discountType: 'percent', discountValue: 0 },
  ],
};

// O'tmishdagi akademik oyna → barcha oy muddati kelgan (deterministik).
const academic = { start: '2020-09-01', end: '2021-06-30', months: 10, resolved: true };

function makeStudent(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'stu-1',
    firstName: 'Ali',
    lastName: 'Valiyev',
    studentCode: 'ST-1',
    currentClassId: 'cls-1',
    currentClass: { name: '1A' },
    monthlyFee: 1000000,
    discountType: 'percent',
    discountValue: 0,
    paymentPlan: 'monthly',
    billingStartDate: '2020-09-01',
    createdAt: '2020-09-01',
    status: 'active',
    ...over,
  };
}

function buildService(students: unknown[], paidRaw: unknown[]) {
  const studentsRepo = { createQueryBuilder: jest.fn(() => qbMock(students)) };
  const paymentsRepo = { createQueryBuilder: jest.fn(() => qbMock(paidRaw, true)) };
  const plans = { getContext: jest.fn(async () => ({ config, academic })) };
  return new DebtsService(studentsRepo as never, paymentsRepo as never, plans as never, null as never);
}

describe('DebtsService', () => {
  describe('getStudents', () => {
    it('oylik matritsa + balans xulosasi (umuman to‘lamagan)', async () => {
      const svc = buildService([makeStudent()], []);
      const res = await svc.getStudents({ page: 1, limit: 20 });
      expect(res.axis).toHaveLength(10);
      expect(res.items).toHaveLength(1);
      const row = res.items[0];
      expect(row.months).toHaveLength(10);
      // monthly reja, oylik 1M, chegirma yo'q → har oy kutilgan 1M, to'langan 0
      expect(row.months[0].expected).toBe(1000000);
      expect(row.months[0].paid).toBe(0);
      expect(row.months[0].status).toBe('pending');
      // 10 oy × 1M = 10M qarz
      expect(row.parentOwes).toBe(10000000);
      expect(row.realBalance).toBe(-10000000);
      expect(res.summary.parentOwesTotal).toBe(10000000);
      expect(res.summary.debtorCount).toBe(1);
    });

    it('to‘langan oy → paid status, qisman → partial', async () => {
      const paid = [
        { studentId: 'stu-1', year: 2020, month: 9, paid: '1000000' },
        { studentId: 'stu-1', year: 2020, month: 10, paid: '400000' },
      ];
      const svc = buildService([makeStudent()], paid);
      const res = await svc.getStudents({});
      const m = res.items[0].months;
      expect(m.find((c) => c.month === 9)!.status).toBe('paid');
      expect(m.find((c) => c.month === 10)!.status).toBe('partial');
      expect(m.find((c) => c.month === 11)!.status).toBe('pending');
    });

    it('ortiqcha to‘lov → maktab qarzi (avans)', async () => {
      const paid = [{ studentId: 'stu-1', year: 2020, month: 9, paid: '15000000' }];
      const svc = buildService([makeStudent()], paid);
      const res = await svc.getStudents({});
      // 9-oy 1M kutilgan, 15M to'langan → 14M avans, qolgan 9 oy 9M qarz → net +5M
      expect(res.items[0].schoolOwes).toBe(14000000);
      expect(res.items[0].parentOwes).toBe(9000000);
      expect(res.items[0].realBalance).toBe(5000000);
    });

    it('holat filtri: to‘lanmagan', async () => {
      const students = [
        makeStudent({ id: 'a', firstName: 'A' }),
        makeStudent({ id: 'b', firstName: 'B' }),
      ];
      // b to'liq to'lagan (har oy 1M), a hech narsa
      const paid = academicMonths().map((k) => ({ studentId: 'b', year: k.year, month: k.month, paid: '1000000' }));
      const svc = buildService(students, paid);
      const res = await svc.getStudents({ status: 'unpaid' });
      expect(res.items.map((r) => r.studentId)).toEqual(['a']);
    });

    it('oynadan oldingi to‘lov (yozgi avans) → birinchi oyga (Sentyabr) clamp', async () => {
      // 2020-06 (oynadan oldin) to'lov → 2020-09 (birinchi akademik oy)ga tushadi
      const paid = [{ studentId: 'stu-1', year: 2020, month: 6, paid: '3000000' }];
      const svc = buildService([makeStudent()], paid);
      const res = await svc.getStudents({});
      const sep = res.items[0].months.find((c) => c.year === 2020 && c.month === 9)!;
      expect(sep.paid).toBe(3000000);
      // oynadan tashqari 2020-06 alohida katak sifatida chiqmaydi (faqat axis oylari)
      expect(res.items[0].months.some((c) => c.year === 2020 && c.month === 6)).toBe(false);
      expect(res.items[0].months).toHaveLength(10);
    });

    it('sahifalash meta', async () => {
      const students = Array.from({ length: 25 }, (_, i) => makeStudent({ id: `s${i}`, firstName: `S${i}` }));
      const svc = buildService(students, []);
      const res = await svc.getStudents({ page: 2, limit: 10 });
      expect(res.meta).toEqual({ page: 2, limit: 10, total: 25, pageCount: 3 });
      expect(res.items).toHaveLength(10);
    });
  });

  describe('getOverview', () => {
    it('KPI + oylik taqsimot + jami', async () => {
      const paid = [
        { studentId: 'stu-1', year: 2020, month: 9, paid: '1000000' }, // sen to'liq
        { studentId: 'stu-1', year: 2020, month: 10, paid: '500000' }, // okt qisman
      ];
      const svc = buildService([makeStudent()], paid);
      const res = await svc.getOverview();
      expect(res.monthly).toHaveLength(10);
      const sep = res.monthly.find((m) => m.month === 9)!;
      expect(sep.expected).toBe(1000000);
      expect(sep.collected).toBe(1000000);
      expect(sep.fullyPaid).toBe(1);
      expect(Math.round(sep.collectionRate)).toBe(100);
      // umumiy qoldiq: 10M kutilgan − 1.5M to'langan = 8.5M
      expect(res.kpi.totalOutstanding).toBe(8500000);
      expect(res.total.expected).toBe(10000000);
      expect(res.total.collected).toBe(1500000);
    });

    it('o‘qi (axis) ni faol o‘quvchilar ro‘yxatidan JS’da hisoblaydi — alohida MIN so‘rovisiz (T-07)', async () => {
      // Ikkita talaba, ikkita xil billing_start_date — eng ertasi (avgust)
      // o'qi boshini akademik yil (sentyabr) dan oldinga suradi.
      const earlier = makeStudent({ id: 'stu-2', billingStartDate: '2020-08-01' });
      const later = makeStudent({ id: 'stu-1', billingStartDate: '2020-09-15' });
      const studentsRepo = { createQueryBuilder: jest.fn(() => qbMock([earlier, later])) };
      const paymentsRepo = { createQueryBuilder: jest.fn(() => qbMock([], true)) };
      const plans = { getContext: jest.fn(async () => ({ config, academic })) };
      const svc = new DebtsService(studentsRepo as never, paymentsRepo as never, plans as never, null as never);

      const res = await svc.getOverview();

      // Avgust ham o'qga kirgan — 10 oylik akademik oynadan bittasi ortiq.
      expect(res.monthly).toHaveLength(11);
      expect(res.monthly[0].month).toBe(8);
      // `resolveAxis()`ning o'zi (alohida MIN(COALESCE(...)) so'rovi) endi
      // bu yo'lda chaqirilmaydi — o'quvchilar ro'yxati BIR marta o'qiladi.
      expect(studentsRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('kesh (T-08)', () => {
    function buildCachedService(students: unknown[], paidRaw: unknown[]) {
      const studentsRepo = { createQueryBuilder: jest.fn(() => qbMock(students)) };
      const paymentsRepo = { createQueryBuilder: jest.fn(() => qbMock(paidRaw, true)) };
      const plans = { getContext: jest.fn(async () => ({ config, academic })) };
      const service = new DebtsService(
        studentsRepo as never,
        paymentsRepo as never,
        plans as never,
        null as never,
      );
      return { service, studentsRepo, paymentsRepo };
    }

    it('getOverview — TTL ichida ikkinchi chaqiruv qayta so‘ramaydi (kesh hit)', async () => {
      const { service, studentsRepo } = buildCachedService([makeStudent()], []);
      const first = await service.getOverview();
      const second = await service.getOverview();
      expect(second).toEqual(first); // bir xil obyekt — qayta hisoblanmagan
      expect(studentsRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('getStudents — bir xil query ikkinchi marta keshdan qaytadi', async () => {
      // Har haqiqiy chaqiriq `studentsRepo.createQueryBuilder`ni 2 marta ishlatadi
      // (resolveAxis()ning MIN so'rovi + asosiy ro'yxat so'rovi) — kesh hit bo'lsa
      // ikkinchi `getStudents()` bittasini ham qo'shmaydi.
      const { service, studentsRepo } = buildCachedService([makeStudent()], []);
      await service.getStudents({ page: 1, limit: 20 });
      await service.getStudents({ page: 1, limit: 20 });
      expect(studentsRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
    });

    it('getStudents — boshqa query (masalan sahifa) keshni bo‘lishmaydi, qayta so‘raydi', async () => {
      const { service, studentsRepo } = buildCachedService([makeStudent()], []);
      await service.getStudents({ page: 1, limit: 20 });
      await service.getStudents({ page: 2, limit: 20 });
      expect(studentsRepo.createQueryBuilder).toHaveBeenCalledTimes(4);
    });

    it('invalidateCache() — to‘lov yozilgach keshni bosh so‘rov bilan darhol yangilaydi', async () => {
      const { service, studentsRepo } = buildCachedService([makeStudent()], []);
      await service.getOverview();
      service.invalidateCache();
      await service.getOverview();
      expect(studentsRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
    });
  });
});

function academicMonths() {
  const out: { year: number; month: number }[] = [];
  let y = 2020;
  let m = 9;
  for (let i = 0; i < 10; i += 1) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
