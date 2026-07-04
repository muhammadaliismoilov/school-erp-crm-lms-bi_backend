import { BadRequestException } from '@nestjs/common';
import { PayrollEngineService, PeriodContext } from '../src/modules/hr/payroll-engine.service';
import { Payroll } from '../src/modules/hr/entities/payroll.entity';
import { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { Teacher } from '../src/modules/hr/entities/teacher.entity';
import { StaffLeave } from '../src/modules/hr/entities/staff-leave.entity';
import { ClassLeaderAssignment } from '../src/modules/hr/entities/class-leader-assignment.entity';
import { PayrollAdjustment } from '../src/modules/hr/entities/payroll-adjustment.entity';
import { PayRateCard } from '../src/modules/hr/entities/pay-rate-card.entity';
import {
  LeaveType,
  PayrollAdjustmentType,
  PayrollItemType,
  PayrollStatus,
  QualificationCategory,
  StaffKpiMode,
} from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

// ─── Fixture yordamchilari ──────────────────────────────────────────────────

/** 2026-iyul: 31 kun, yakshanbalar 05/12/19/26 → 27 ish kuni. */
function makeCtx(over: Partial<PeriodContext> = {}): PeriodContext {
  const period = '2026-07';
  const workdays: string[] = [];
  for (let d = 1; d <= 31; d += 1) {
    const iso = `${period}-${String(d).padStart(2, '0')}`;
    if (new Date(`${iso}T00:00:00Z`).getUTCDay() === 0) continue;
    workdays.push(iso);
  }
  return {
    period,
    monthStart: '2026-07-01',
    monthEnd: '2026-07-31',
    daysInMonth: 31,
    workdays,
    settings: { classLeaderRate: 600000, maxClassLeaderships: 3 },
    teacherByStaff: new Map(),
    sessionsByTeacher: new Map(),
    attendanceByUser: new Map(),
    hasAnyAttendance: new Set(),
    leavesByStaff: new Map(),
    assignmentsByTeacher: new Map(),
    adjustmentsByStaff: new Map(),
    rateCards: [],
    ...over,
  };
}

function makeStaff(over: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 's-1',
    userId: 'u-1',
    firstName: 'Davron',
    lastName: 'Karimov',
    salary: 0,
    kpiMode: null,
    kpiValue: 0,
    qualificationCategory: null,
    ...over,
  } as StaffMember;
}

function makeTeacher(over: Partial<Teacher> = {}): Teacher {
  return { id: 't-1', staffMemberId: 's-1', ratePerLesson: 0, ...over } as Teacher;
}

function card(category: QualificationCategory, rate: number, from: string): PayRateCard {
  return { category, ratePerLesson: rate, effectiveFrom: from } as PayRateCard;
}

/** Barcha ish kunlarida kelgan deb belgilash. */
function fullAttendance(ctx: PeriodContext, userId: string, exceptDays: string[] = []): void {
  const set = new Set(ctx.workdays.filter((d) => !exceptDays.includes(d)));
  ctx.attendanceByUser.set(userId, set);
  ctx.hasAnyAttendance.add(userId);
}

function sum(items: { amount: number }[]): number {
  return items.reduce((s, i) => s + i.amount, 0);
}

// ─── Service (repo'lar computeItems uchun kerak emas) ───────────────────────

function makeService(payrolls?: { findOne: jest.Mock; save: jest.Mock }): PayrollEngineService {
  const noop = {} as never;
  const tenant = { getSchoolId: () => null, getBranchId: () => null } as unknown as TenantContextService;
  return new PayrollEngineService(
    (payrolls ?? noop) as never,
    noop, noop, noop, noop, noop, noop, noop, noop, noop,
    noop, noop,
    tenant,
  );
}

describe('PayrollEngineService.computeItems', () => {
  const service = makeService();

  it('oklad: to‘liq davomat → faqat BASE_SALARY, ushlab qolish yo‘q', () => {
    const ctx = makeCtx();
    const staff = makeStaff({ salary: 8_000_000 });
    fullAttendance(ctx, 'u-1');
    const { items, warnings } = service.computeItems(staff, ctx);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe(PayrollItemType.BASE_SALARY);
    expect(items[0].amount).toBe(8_000_000);
    expect(items[0].quantity).toBe(27); // 2026-iyulda 27 ish kuni
    expect(warnings).toHaveLength(0);
  });

  it('oklad: 2 kun sababsiz → ABSENCE_DEDUCTION = -2×kunlik', () => {
    const ctx = makeCtx();
    const staff = makeStaff({ salary: 2_700_000 }); // kunlik = 100 000
    fullAttendance(ctx, 'u-1', ['2026-07-01', '2026-07-02']);
    const { items } = service.computeItems(staff, ctx);
    const ded = items.find((i) => i.type === PayrollItemType.ABSENCE_DEDUCTION);
    expect(ded).toBeDefined();
    expect(ded!.quantity).toBe(2);
    expect(ded!.amount).toBe(-200_000);
    expect(sum(items)).toBe(2_500_000);
  });

  it('oklad: kasallik varaqasi (to‘lanadigan) kunlar ushlab qolinmaydi, ish haqisiz ta‘til ushlab qolinadi', () => {
    const ctx = makeCtx();
    const staff = makeStaff({ salary: 2_700_000 });
    fullAttendance(ctx, 'u-1', ['2026-07-01', '2026-07-02', '2026-07-03']);
    ctx.leavesByStaff.set('s-1', [
      { staffMemberId: 's-1', type: LeaveType.SICK, startDate: '2026-07-01', endDate: '2026-07-01' } as StaffLeave,
      { staffMemberId: 's-1', type: LeaveType.UNPAID, startDate: '2026-07-02', endDate: '2026-07-02' } as StaffLeave,
    ]);
    const { items } = service.computeItems(staff, ctx);
    const ded = items.find((i) => i.type === PayrollItemType.ABSENCE_DEDUCTION);
    // 01 — kasallik (to'lanadi), 02 — ish haqisiz (ushlanadi), 03 — sababsiz (ushlanadi)
    expect(ded!.quantity).toBe(2);
    expect(ded!.amount).toBe(-200_000);
  });

  it('oklad: turniket ma‘lumoti umuman yo‘q → ushlab qolinmaydi + ogohlantirish', () => {
    const ctx = makeCtx();
    const staff = makeStaff({ salary: 5_000_000 });
    const { items, warnings } = service.computeItems(staff, ctx);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe(PayrollItemType.BASE_SALARY);
    expect(warnings.some((w) => w.includes('turniket'))).toBe(true);
  });

  it('dars haqi: toifa stavkasi bilan, oy o‘rtasida stavka o‘zgarsa ikkala stavka ham qo‘llanadi', () => {
    const ctx = makeCtx({
      rateCards: [
        card(QualificationCategory.OLIY, 70_000, '2026-07-15'), // yangi (DESC tartib)
        card(QualificationCategory.OLIY, 60_000, '2026-01-01'),
      ],
    });
    const staff = makeStaff({ qualificationCategory: QualificationCategory.OLIY });
    ctx.teacherByStaff.set('s-1', makeTeacher());
    ctx.sessionsByTeacher.set('t-1', ['2026-07-10', '2026-07-10', '2026-07-20']);
    const { items, warnings } = service.computeItems(staff, ctx);
    const lessons = items.filter((i) => i.type === PayrollItemType.LESSON_PAY);
    expect(lessons).toHaveLength(2);
    expect(sum(lessons)).toBe(2 * 60_000 + 70_000);
    expect(warnings).toHaveLength(0);
  });

  it('dars haqi: toifa yo‘q → shaxsiy stavka fallback + ogohlantirish', () => {
    const ctx = makeCtx();
    const staff = makeStaff();
    ctx.teacherByStaff.set('s-1', makeTeacher({ ratePerLesson: 45_000 }));
    ctx.sessionsByTeacher.set('t-1', ['2026-07-03', '2026-07-04']);
    const { items, warnings } = service.computeItems(staff, ctx);
    const lesson = items.find((i) => i.type === PayrollItemType.LESSON_PAY);
    expect(lesson!.amount).toBe(90_000);
    expect(warnings.some((w) => w.includes('shaxsiy stavka'))).toBe(true);
  });

  it('sinf rahbarligi: to‘liq oy = to‘liq stavka; yarim oy proporsional', () => {
    const ctx = makeCtx();
    const staff = makeStaff();
    ctx.teacherByStaff.set('s-1', makeTeacher());
    ctx.assignmentsByTeacher.set('t-1', [
      { id: 'a-1', teacherId: 't-1', startDate: '2026-01-01', endDate: null, schoolClass: { name: '5-A' } } as unknown as ClassLeaderAssignment,
      { id: 'a-2', teacherId: 't-1', startDate: '2026-07-17', endDate: null, schoolClass: { name: '6-B' } } as unknown as ClassLeaderAssignment,
    ]);
    const { items } = service.computeItems(staff, ctx);
    const leaders = items.filter((i) => i.type === PayrollItemType.CLASS_LEADER);
    expect(leaders).toHaveLength(2);
    expect(leaders[0].amount).toBe(600_000); // 31/31 kun
    expect(leaders[1].quantity).toBe(15); // 17..31 = 15 kun
    expect(leaders[1].amount).toBe(Math.round((600_000 * 15 * 100) / 31) / 100);
  });

  it('KPI: percent — musbat bazaning foizi; fixed — qat‘iy summa', () => {
    const ctxP = makeCtx();
    const staffP = makeStaff({ salary: 1_000_000, kpiMode: StaffKpiMode.PERCENT, kpiValue: 10 });
    fullAttendance(ctxP, 'u-1');
    const { items: itemsP } = service.computeItems(staffP, ctxP);
    const kpiP = itemsP.find((i) => i.type === PayrollItemType.KPI_BONUS);
    expect(kpiP!.amount).toBe(100_000);

    const ctxF = makeCtx();
    const staffF = makeStaff({ salary: 1_000_000, kpiMode: StaffKpiMode.FIXED, kpiValue: 250_000 });
    fullAttendance(ctxF, 'u-1');
    const { items: itemsF } = service.computeItems(staffF, ctxF);
    const kpiF = itemsF.find((i) => i.type === PayrollItemType.KPI_BONUS);
    expect(kpiF!.amount).toBe(250_000);
  });

  it('bonus/jarima: bonus musbat, jarima manfiy, sabab note‘da', () => {
    const ctx = makeCtx();
    const staff = makeStaff();
    ctx.adjustmentsByStaff.set('s-1', [
      { id: 'adj-1', type: PayrollAdjustmentType.BONUS, amount: 500_000, reason: 'Ochiq dars' } as PayrollAdjustment,
      { id: 'adj-2', type: PayrollAdjustmentType.PENALTY, amount: 100_000, reason: 'Kechikish' } as PayrollAdjustment,
    ]);
    const { items } = service.computeItems(staff, ctx);
    expect(items.find((i) => i.type === PayrollItemType.MANUAL_BONUS)!.amount).toBe(500_000);
    const pen = items.find((i) => i.type === PayrollItemType.PENALTY)!;
    expect(pen.amount).toBe(-100_000);
    expect(pen.note).toBe('Kechikish');
    expect(sum(items)).toBe(400_000);
  });

  it('to‘liq stsenariy: oliy toifali sinf rahbari o‘qituvchi — barcha komponentlar birga', () => {
    const ctx = makeCtx({ rateCards: [card(QualificationCategory.OLIY, 60_000, '2026-01-01')] });
    const staff = makeStaff({
      salary: 0,
      qualificationCategory: QualificationCategory.OLIY,
      kpiMode: StaffKpiMode.PERCENT,
      kpiValue: 5,
    });
    ctx.teacherByStaff.set('s-1', makeTeacher());
    ctx.sessionsByTeacher.set('t-1', Array(84).fill('2026-07-10')); // 84 dars
    ctx.assignmentsByTeacher.set('t-1', [
      { id: 'a-1', teacherId: 't-1', startDate: '2026-01-01', endDate: null, schoolClass: { name: '5-A' } } as unknown as ClassLeaderAssignment,
      { id: 'a-2', teacherId: 't-1', startDate: '2026-01-01', endDate: null, schoolClass: { name: '6-B' } } as unknown as ClassLeaderAssignment,
    ]);
    const { items } = service.computeItems(staff, ctx);
    const lessons = 84 * 60_000; // 5 040 000
    const leader = 2 * 600_000; //  1 200 000
    const kpi = Math.round(((lessons + leader) * 5) / 100); // 312 000
    expect(sum(items)).toBe(lessons + leader + kpi);
  });
});

describe('PayrollEngineService.transition (holat mashinasi)', () => {
  function makePayroll(status: PayrollStatus): Payroll {
    return { id: 'p-1', staffMemberId: 's-1', period: '2026-07', status } as Payroll;
  }

  function serviceWith(status: PayrollStatus) {
    const payroll = makePayroll(status);
    const payrolls = {
      findOne: jest.fn().mockResolvedValue(payroll),
      save: jest.fn().mockImplementation(async (v) => v),
    };
    const svc = makeService(payrolls);
    // getView chaqiruvi ham findOne'dan foydalanadi — items bilan qaytaramiz.
    payrolls.findOne.mockResolvedValue({ ...payroll, items: [], staffMember: null });
    return { svc, payrolls, payroll };
  }

  it('submit: draft → pending_approval', async () => {
    const { svc, payrolls } = serviceWith(PayrollStatus.DRAFT);
    await svc.transition('p-1', 'submit');
    expect(payrolls.save).toHaveBeenCalledWith(expect.objectContaining({ status: PayrollStatus.PENDING_APPROVAL }));
  });

  it('approve: draft holatidan taqiqlanadi (avval submit kerak)', async () => {
    const { svc, payrolls } = serviceWith(PayrollStatus.DRAFT);
    await expect(svc.transition('p-1', 'approve')).rejects.toBeInstanceOf(BadRequestException);
    expect(payrolls.save).not.toHaveBeenCalled();
  });

  it('lock: faqat paid holatidan', async () => {
    const { svc: svcPaid, payrolls: pPaid } = serviceWith(PayrollStatus.PAID);
    await svcPaid.transition('p-1', 'lock');
    expect(pPaid.save).toHaveBeenCalledWith(expect.objectContaining({ status: PayrollStatus.LOCKED }));

    const { svc: svcDraft } = serviceWith(PayrollStatus.DRAFT);
    await expect(svcDraft.transition('p-1', 'lock')).rejects.toBeInstanceOf(BadRequestException);
  });

  it("noma'lum amal — BadRequest", async () => {
    const { svc } = serviceWith(PayrollStatus.DRAFT);
    await expect(svc.transition('p-1', 'foo')).rejects.toBeInstanceOf(BadRequestException);
  });
});
