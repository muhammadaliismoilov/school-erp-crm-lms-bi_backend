import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { StudentStatus } from '../students/enums/student-status.enum';
import {
  comparePlans,
  DiscountType,
  effectiveMonthlyFee,
  PlanCode,
  PlanConfig,
} from './billing.util';
import {
  aggregateMonth,
  buildMonthAxis,
  buildStudentCells,
  DebtCell,
  DebtCellStatus,
  MonthKey,
  monthKeyStr,
  MonthlyAggregate,
  summarizeStudent,
} from './debts.util';
import { StudentPayment } from './entities/student-payment.entity';
import { AcademicWindow, PaymentPlanService } from './payment-plan.service';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope } from '../../common/tenant/tenant-scope.util';

export interface DebtsQuery {
  search?: string;
  classId?: string;
  /** Holat filtri: barcha / to'lanmagan / qisman / to'liq. */
  status?: 'unpaid' | 'partial' | 'paid';
  /** Tanlangan oy (`YYYY-MM`) — berilsa holat filtri shu oyga nisbatan. */
  month?: string;
  page?: number;
  limit?: number;
}

export interface DebtMonthCellDto extends MonthKey {
  expected: number;
  paid: number;
  discount: number;
  due: boolean;
  status: DebtCellStatus;
}

export interface StudentDebtRow {
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
  plan: PlanCode | null;
  months: DebtMonthCellDto[];
  /** Maktab ota-ona oldida qarzi (+ avans). */
  schoolOwes: number;
  /** Ota-ona maktab oldida qarzi (qoldiq qarz). */
  parentOwes: number;
  /** Real balans (+ avans, − qarz). */
  realBalance: number;
}

export interface DebtsStudentsResponse {
  axis: MonthKey[];
  items: StudentDebtRow[];
  meta: { page: number; limit: number; total: number; pageCount: number };
  summary: {
    /** Maktab ota-ona oldida qarzi (jami avans). */
    schoolOwesTotal: number;
    /** Ota-ona maktab oldida qarzi (jami qoldiq qarz). */
    parentOwesTotal: number;
    realBalanceTotal: number;
    studentCount: number;
    debtorCount: number;
  };
}

export interface DebtsOverviewResponse {
  academic: AcademicWindow;
  kpi: {
    totalOutstanding: number;
    debtorCount: number;
    currentMonthRate: number;
    currentMonthCollected: number;
  };
  chart: { year: number; month: number; expected: number; collected: number; rate: number }[];
  monthly: MonthlyAggregate[];
  total: MonthlyAggregate;
}

interface StudentExpected {
  /** `YYYY-MM` → kutilgan summa. */
  expectedByMonth: Map<string, number>;
  /** `YYYY-MM` → chegirma summasi. */
  discountByMonth: Map<string, number>;
  plan: PlanCode | null;
}

/**
 * Qarzlar (debts) — oylik matritsa, oylik taqsimot, KPI va balans xulosasi.
 * Kutilgan summa reja jadvalidan (`billing.util`), to'langan summa
 * `StudentPayment` qatorlaridan (oy/yil bo'yicha). Hisob `debts.util` sof
 * funksiyalari orqali — testlanadi. Faqat o'qish (read-only).
 */
@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(StudentPayment)
    private readonly payments: Repository<StudentPayment>,
    private readonly plans: PaymentPlanService,
    private readonly tenant: TenantContextService,
  ) {}

  // ─── Umumiy ko'rinish (KPI + chart + oylik taqsimot) ────────────────────────

  async getOverview(): Promise<DebtsOverviewResponse> {
    const now = new Date();
    const ctx = await this.plans.getContext();
    const axis = await this.resolveAxis(ctx.academic);

    const students = await this.activeStudentsQb().getMany();
    const paidMap = await this.paidByStudentMonth(axis);

    // Har o'quvchi → oylik katakchalar.
    const allCells: DebtCell[][] = students.map((s) =>
      this.studentCells(s, axis, paidMap, ctx, now),
    );

    // Oylik taqsimot — har oy bo'yicha barcha o'quvchilarni yig'amiz.
    const monthly: MonthlyAggregate[] = axis.map((k) => {
      const cellsForMonth = allCells.map((cells) => cells.find((c) => c.year === k.year && c.month === k.month)!).filter(Boolean);
      return aggregateMonth(k, cellsForMonth);
    });

    // "Jami" qatori.
    const total = this.sumMonthly(monthly);

    // KPI — joriy oy + umumiy qoldiq.
    const totalOutstanding = students.reduce((acc, _s, i) => acc + summarizeStudent(allCells[i]).parentOwes, 0);
    const debtorCount = students.reduce((acc, _s, i) => acc + (summarizeStudent(allCells[i]).realBalance < -1 ? 1 : 0), 0);
    const curKey: MonthKey = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
    const curRow = monthly.find((m) => m.year === curKey.year && m.month === curKey.month);

    return {
      academic: ctx.academic,
      kpi: {
        totalOutstanding,
        debtorCount,
        currentMonthRate: curRow?.collectionRate ?? 0,
        currentMonthCollected: curRow?.collected ?? 0,
      },
      chart: monthly.map((m) => ({ year: m.year, month: m.month, expected: m.expected, collected: m.collected, rate: m.collectionRate })),
      monthly,
      total,
    };
  }

  // ─── O'quvchilar qarzlari matritsasi ────────────────────────────────────────

  async getStudents(query: DebtsQuery = {}): Promise<DebtsStudentsResponse> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = query.limit ?? 20;
    const now = new Date();
    const ctx = await this.plans.getContext();
    const axis = await this.resolveAxis(ctx.academic);

    const qb = this.activeStudentsQb();
    if (query.classId) qb.andWhere('s.current_class_id = :classId', { classId: query.classId });
    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('s.first_name ILIKE :q', { q: `%${search}%` })
            .orWhere('s.last_name ILIKE :q', { q: `%${search}%` })
            .orWhere('s.student_code ILIKE :q', { q: `%${search}%` });
        }),
      );
    }
    const students = await qb.getMany();
    const paidMap = await this.paidByStudentMonth(axis);

    let rows: StudentDebtRow[] = students.map((s) => {
      const cells = this.studentCells(s, axis, paidMap, ctx, now);
      const sum = summarizeStudent(cells);
      return {
        studentId: s.id,
        studentName: `${s.lastName ?? ''} ${s.firstName ?? ''}`.trim() || s.studentCode,
        classId: s.currentClassId ?? null,
        className: this.classLabel(s.currentClass),
        plan: (s.paymentPlan ?? null) as PlanCode | null,
        months: cells.map((c) => ({
          year: c.year,
          month: c.month,
          expected: c.expected,
          paid: c.paid,
          discount: c.discount,
          due: c.due,
          status: c.status,
        })),
        schoolOwes: sum.schoolOwes,
        parentOwes: sum.parentOwes,
        realBalance: sum.realBalance,
      };
    });

    // Holat filtri — oy berilsa shu oyga, aks holda umumiy balansga nisbatan.
    if (query.status) {
      rows = rows.filter((r) => this.matchesStatus(r, query.status!, query.month));
    }

    // Balans xulosasi — filtrlangan to'liq ro'yxatdan (sahifalashdan oldin).
    const summary = {
      schoolOwesTotal: rows.reduce((s, r) => s + r.schoolOwes, 0),
      parentOwesTotal: rows.reduce((s, r) => s + r.parentOwes, 0),
      realBalanceTotal: rows.reduce((s, r) => s + r.realBalance, 0),
      studentCount: rows.length,
      debtorCount: rows.filter((r) => r.realBalance < -1).length,
    };

    // Saralash: eng qarzdor avval.
    rows.sort((a, b) => a.realBalance - b.realBalance);

    const total = rows.length;
    const pageCount = Math.ceil(total / limit) || 1;
    const items = rows.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { axis, items, meta: { page, limit, total, pageCount }, summary };
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────────

  private activeStudentsQb() {
    const qb = this.students
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.currentClass', 'c')
      .where('s.status = :active', { active: StudentStatus.ACTIVE });
    applyTenantScope(qb, 's', this.tenant, { branch: true });
    return qb;
  }

  /** O'quvchining billing boshlanish oyi (ordinal: year×12+month). billing_start_date ?? created_at. */
  private billingMonthOrd(student: Student): number {
    const raw = student.billingStartDate ?? student.createdAt;
    // billing_start_date — "YYYY-MM-DD" string; created_at — Date obyekt. Ikkalasini ham qo'llaymiz.
    const d = raw instanceof Date ? raw : new Date(`${String(raw).slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
    return d.getUTCFullYear() * 12 + (d.getUTCMonth() + 1);
  }

  /**
   * Oylik o'qi — akademik yil oynasi, lekin billing undan oldin boshlangan bo'lsa
   * (mas. billing_start_date NULL → created_at yozda) o'qi shu eng erta oydan
   * boshlanadi. Shunda allaqachon hisoblangan oylar (qarz) ham ko'rinadi va
   * o'quvchi detali "To'lovlar" tabidagi balans bilan mos keladi. Eng erta sana
   * barcha faol o'quvchilardan (filtrdan mustaqil) olinadi — o'qi barqaror.
   */
  private async resolveAxis(academic: AcademicWindow): Promise<MonthKey[]> {
    const row = await this.activeStudentsQb()
      .select('MIN(COALESCE(s.billing_start_date, s.created_at))', 'earliest')
      .getRawOne<{ earliest: string | null }>();

    const acStart = new Date(`${academic.start.slice(0, 10)}T00:00:00Z`);
    let startOrd = acStart.getUTCFullYear() * 12 + (acStart.getUTCMonth() + 1);
    if (row?.earliest) {
      const e = new Date(`${String(row.earliest).slice(0, 10)}T00:00:00Z`);
      if (!Number.isNaN(e.getTime())) {
        const eOrd = e.getUTCFullYear() * 12 + (e.getUTCMonth() + 1);
        if (eOrd < startOrd) startOrd = eOrd;
      }
    }
    const startYear = Math.floor((startOrd - 1) / 12);
    const startMonth = startOrd - startYear * 12;
    const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
    return buildMonthAxis(start, academic.end);
  }

  /**
   * Har o'quvchi-oy uchun jami to'lov: `studentId|YYYY-MM` → paid.
   * Akademik oynadan tashqari to'lov (mas. yozgi avans) eng yaqin akademik oyga
   * clamp qilinadi — yil boshidan oldingisi birinchi oyga (Sentyabr), oxiridan
   * keyingisi oxirgi oyga. Shu tariqa avans Sentyabrda yig'ilgan bo'lib chiqadi.
   */
  private async paidByStudentMonth(axis: MonthKey[]): Promise<Map<string, number>> {
    const paymentsQb = this.payments
      .createQueryBuilder('p')
      .select('p.student_id', 'studentId')
      .addSelect('p.year', 'year')
      .addSelect('p.month', 'month')
      .addSelect('SUM(p.amount)', 'paid')
      .where('p.student_id IS NOT NULL')
      .groupBy('p.student_id')
      .addGroupBy('p.year')
      .addGroupBy('p.month');
    applyTenantScope(paymentsQb, 'p', this.tenant, { branch: true });
    const rows = await paymentsQb.getRawMany<{ studentId: string; year: number; month: number; paid: string }>();

    const map = new Map<string, number>();
    if (axis.length === 0) return map;
    const first = axis[0];
    const last = axis[axis.length - 1];
    const ord = (y: number, m: number) => y * 12 + m;
    const firstOrd = ord(first.year, first.month);
    const lastOrd = ord(last.year, last.month);

    for (const r of rows) {
      const o = ord(r.year, r.month);
      const target = o < firstOrd ? first : o > lastOrd ? last : { year: r.year, month: r.month };
      const key = `${r.studentId}|${monthKeyStr(target)}`;
      map.set(key, (map.get(key) ?? 0) + (Number(r.paid) || 0));
    }
    return map;
  }

  /** Bitta o'quvchining oylik matritsasi (kutilgan reja jadvalidan, to'langan map'dan). */
  private studentCells(
    student: Student,
    axis: MonthKey[],
    paidMap: Map<string, number>,
    ctx: { config: PlanConfig; academic: AcademicWindow },
    now: Date,
  ): DebtCell[] {
    const exp = this.expectedFor(student, axis, ctx);
    return buildStudentCells(
      axis,
      (k) => {
        const mk = monthKeyStr(k);
        return {
          expected: exp.expectedByMonth.get(mk) ?? 0,
          paid: paidMap.get(`${student.id}|${mk}`) ?? 0,
          discount: exp.discountByMonth.get(mk) ?? 0,
        };
      },
      now,
    );
  }

  /** Reja jadvalidan oyma-oy kutilgan summa + chegirma. */
  private expectedFor(
    student: Student,
    axis: MonthKey[],
    ctx: { config: PlanConfig; academic: AcademicWindow },
  ): StudentExpected {
    const monthlyFee = Number(student.monthlyFee) || 0;
    const discountType = (student.discountType ?? 'percent') as DiscountType;
    const discountValue = Number(student.discountValue) || 0;
    const effMonthly = effectiveMonthlyFee(monthlyFee, discountType, discountValue);
    const monthlyDiscount = Math.max(monthlyFee - effMonthly, 0);
    const plan = (student.paymentPlan ?? null) as PlanCode | null;

    const expectedByMonth = new Map<string, number>();
    const discountByMonth = new Map<string, number>();

    if (!plan || plan === 'monthly') {
      // Oyma-oy: billing boshlangan oydan boshlab har oy = effektiv tarif.
      const billStart = this.billingMonthOrd(student);
      for (const k of axis) {
        const billed = k.year * 12 + k.month >= billStart;
        expectedByMonth.set(monthKeyStr(k), billed ? effMonthly : 0);
        discountByMonth.set(monthKeyStr(k), billed ? monthlyDiscount : 0);
      }
      return { expectedByMonth, discountByMonth, plan };
    }

    // Bo'lib to'lash: reja jadvalidagi bo'limlarni tegishli oyga joylaymiz.
    const config = this.configWithOverride(ctx.config, student, plan);
    const rows = comparePlans(
      {
        monthlyFee,
        discountType,
        discountValue,
        billingStart: student.billingStartDate ?? student.createdAt,
        academicStart: ctx.academic.start,
        academicEnd: ctx.academic.end,
      },
      config,
    );
    const row = rows.find((r) => r.planCode === plan);
    for (const inst of row?.schedule ?? []) {
      const d = new Date(`${inst.dueDate}T00:00:00Z`);
      const mk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      expectedByMonth.set(mk, (expectedByMonth.get(mk) ?? 0) + inst.amount);
    }
    // Chegirma — individual chegirmani akademik oylarga teng taqsimlaymiz.
    for (const k of axis) discountByMonth.set(monthKeyStr(k), monthlyDiscount);
    return { expectedByMonth, discountByMonth, plan };
  }

  private configWithOverride(config: PlanConfig, student: Student, plan: PlanCode): PlanConfig {
    if (!student.planDiscountOverrideType || student.planDiscountOverrideValue == null) return config;
    return {
      ...config,
      rates: config.rates.map((r) =>
        r.planCode === plan
          ? {
              ...r,
              discountType: student.planDiscountOverrideType as DiscountType,
              discountValue: Number(student.planDiscountOverrideValue),
            }
          : r,
      ),
    };
  }

  private matchesStatus(row: StudentDebtRow, status: 'unpaid' | 'partial' | 'paid', month?: string): boolean {
    if (month) {
      const cell = row.months.find((c) => `${c.year}-${String(c.month).padStart(2, '0')}` === month);
      if (!cell) return false;
      if (status === 'paid') return cell.status === 'paid';
      if (status === 'partial') return cell.status === 'partial';
      return cell.due && cell.status === 'pending';
    }
    // Oy berilmagan → umumiy balans bo'yicha.
    if (status === 'paid') return row.realBalance >= -1;
    if (status === 'unpaid') return row.parentOwes > 1 && row.schoolOwes <= 1;
    return row.parentOwes > 1 && row.schoolOwes > 1; // partial — ham qarz ham to'lov
  }

  private sumMonthly(monthly: MonthlyAggregate[]): MonthlyAggregate {
    const acc = monthly.reduce(
      (a, m) => {
        a.expected += m.expected;
        a.collected += m.collected;
        a.remaining += m.remaining;
        a.discount += m.discount;
        a.fullyPaid += m.fullyPaid;
        a.partiallyPaid += m.partiallyPaid;
        a.unpaid += m.unpaid;
        return a;
      },
      { year: 0, month: 0, expected: 0, collected: 0, remaining: 0, discount: 0, collectionRate: 0, fullyPaid: 0, partiallyPaid: 0, unpaid: 0 } as MonthlyAggregate,
    );
    acc.collectionRate = acc.expected > 0 ? (acc.collected / acc.expected) * 100 : 0;
    return acc;
  }

  private classLabel(cls?: SchoolClass | null): string | null {
    if (!cls) return null;
    return cls.name ?? null;
  }
}
