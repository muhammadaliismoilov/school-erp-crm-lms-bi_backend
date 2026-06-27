import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { StudentStatus } from '../students/enums/student-status.enum';
import {
  allocateInstallments,
  BalanceStatus,
  comparePlans,
  computePlanBalance,
  computeStudentBalance,
  DiscountType,
  effectiveMonthlyFee,
  InstallmentState,
  PlanCode,
  PlanConfig,
} from './billing.util';
import { StudentPayment } from './entities/student-payment.entity';
import { AcademicWindow, PaymentPlanService } from './payment-plan.service';

export interface StudentBalanceQuery {
  search?: string;
  classId?: string;
  status?: BalanceStatus;
  /** Saralash: balans o'sish (`balance`) yoki kamayish (`-balance`). Default: -balance (qarzdor avval). */
  sort?: 'balance' | '-balance';
  page?: number;
  limit?: number;
}

export interface StudentBalanceRow {
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
  monthlyFee: number;
  effectiveMonthly: number;
  months: number;
  expected: number;
  paid: number;
  balance: number;
  status: BalanceStatus;
  /** Tanlangan to'lov rejasi (null → oyma-oy). */
  plan?: PlanCode | null;
}

export interface StudentBalancesResponse {
  items: StudentBalanceRow[];
  meta: { page: number; limit: number; total: number; pageCount: number };
  stats: {
    totalDebt: number;
    totalAdvance: number;
    debtorCount: number;
    advanceCount: number;
  };
}

/**
 * O'quvchilar to'lov balansi (qarz/avans). Har o'quvchi uchun chegirmadan keyingi
 * oylik tarif × o'tgan oylar = kutilgan, undan jami to'langan ayriladi.
 * Hisob `billing.util` sof funksiyalari orqali — UI bilan bir xil natija.
 */
@Injectable()
export class StudentBillingService {
  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(StudentPayment)
    private readonly payments: Repository<StudentPayment>,
    private readonly plans: PaymentPlanService,
  ) {}

  /**
   * Bitta o'quvchi balansini hisoblaydi — reja tanlangan bo'lsa reja jadvali
   * bo'yicha (yaxlit/bo'lib), aks holda oyma-oy. Per-student override config'ga
   * qo'llanadi.
   */
  private balanceFor(
    student: Student,
    paid: number,
    ctx: { config: PlanConfig; academic: AcademicWindow },
    now: Date,
  ): {
    effectiveMonthly: number;
    months: number;
    expected: number;
    paid: number;
    balance: number;
    status: BalanceStatus;
    plan: PlanCode | null;
  } {
    const plan = (student.paymentPlan ?? null) as PlanCode | null;
    const base = {
      monthlyFee: Number(student.monthlyFee) || 0,
      discountType: (student.discountType ?? 'percent') as DiscountType,
      discountValue: Number(student.discountValue) || 0,
      billingStart: student.billingStartDate ?? student.createdAt,
      paid,
    };

    // Reja yo'q yoki oyma-oy → mavjud sodda hisob (regresiya yo'q).
    if (!plan || plan === 'monthly') {
      const r = computeStudentBalance(base, now);
      return { ...r, plan };
    }

    // Reja-aware: per-student override config'ga qo'llanadi.
    const config = this.configWithOverride(ctx.config, student, plan);
    const r = computePlanBalance(
      { ...base, academicStart: ctx.academic.start, academicEnd: ctx.academic.end, planCode: plan },
      config,
      now,
    );
    return {
      effectiveMonthly: r.effectiveMonthly,
      months: r.months,
      expected: r.expected,
      paid: r.paid,
      balance: r.balance,
      status: r.status,
      plan,
    };
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

  async findBalances(query: StudentBalanceQuery = {}): Promise<StudentBalancesResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const now = new Date();
    const ctx = await this.plans.getContext();

    // 1. Faol o'quvchilar (filtr: sinf, qidiruv).
    const qb = this.students
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.currentClass', 'c')
      .where('s.status = :active', { active: StudentStatus.ACTIVE });

    if (query.classId) {
      qb.andWhere('s.current_class_id = :classId', { classId: query.classId });
    }
    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('s.first_name ILIKE :s', { s: `%${search}%` })
            .orWhere('s.last_name ILIKE :s', { s: `%${search}%` })
            .orWhere('s.student_code ILIKE :s', { s: `%${search}%` });
        }),
      );
    }
    const students = await qb.getMany();

    // 2. Har o'quvchining jami to'lovi — bitta GROUP BY query.
    const paidRows = await this.payments
      .createQueryBuilder('p')
      .select('p.student_id', 'studentId')
      .addSelect('SUM(p.amount)', 'paid')
      .where('p.student_id IS NOT NULL')
      .groupBy('p.student_id')
      .getRawMany<{ studentId: string; paid: string }>();
    const paidMap = new Map(paidRows.map((r) => [r.studentId, Number(r.paid) || 0]));

    // 3. Balansni hisoblaymiz (reja tanlangan bo'lsa reja jadvali bo'yicha).
    let rows: StudentBalanceRow[] = students.map((student) => {
      const result = this.balanceFor(student, paidMap.get(student.id) ?? 0, ctx, now);
      return {
        studentId: student.id,
        studentName: `${student.lastName ?? ''} ${student.firstName ?? ''}`.trim() || student.studentCode,
        classId: student.currentClassId ?? null,
        className: this.classLabel(student.currentClass),
        monthlyFee: Number(student.monthlyFee) || 0,
        effectiveMonthly: result.effectiveMonthly,
        months: result.months,
        expected: result.expected,
        paid: result.paid,
        balance: result.balance,
        status: result.status,
        plan: result.plan,
      };
    });

    // 4. Stats — filtrlangan to'liq ro'yxatdan (sahifalashdan oldin).
    const stats = {
      totalDebt: rows.filter((r) => r.status === 'debtor').reduce((s, r) => s + Math.abs(r.balance), 0),
      totalAdvance: rows.filter((r) => r.status === 'advance').reduce((s, r) => s + r.balance, 0),
      debtorCount: rows.filter((r) => r.status === 'debtor').length,
      advanceCount: rows.filter((r) => r.status === 'advance').length,
    };

    // 5. Status filtri.
    if (query.status) {
      rows = rows.filter((r) => r.status === query.status);
    }

    // 6. Saralash (default: eng qarzdor avval).
    const dir = query.sort === 'balance' ? 1 : -1;
    rows.sort((a, b) => (a.balance - b.balance) * dir);

    // 7. Sahifalash.
    const total = rows.length;
    const pageCount = Math.ceil(total / limit) || 1;
    const items = rows.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { items, meta: { page, limit, total, pageCount }, stats };
  }

  /** Bitta o'quvchi balansi — detal sahifasi "To'lovlar" tabi uchun. */
  async computeForStudent(studentId: string): Promise<StudentBalanceRow | null> {
    const student = await this.students.findOne({
      where: { id: studentId },
      relations: { currentClass: true },
    });
    if (!student) return null;

    const paidRow = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'paid')
      .where('p.student_id = :studentId', { studentId })
      .getRawOne<{ paid: string }>();

    const ctx = await this.plans.getContext();
    const result = this.balanceFor(student, Number(paidRow?.paid) || 0, ctx, new Date());

    return {
      studentId: student.id,
      studentName: `${student.lastName ?? ''} ${student.firstName ?? ''}`.trim() || student.studentCode,
      classId: student.currentClassId ?? null,
      className: this.classLabel(student.currentClass),
      monthlyFee: Number(student.monthlyFee) || 0,
      effectiveMonthly: result.effectiveMonthly,
      months: result.months,
      expected: result.expected,
      paid: result.paid,
      balance: result.balance,
      status: result.status,
      plan: result.plan,
    };
  }

  private classLabel(cls?: SchoolClass | null): string | null {
    if (!cls) return null;
    return cls.name ?? null;
  }

  /**
   * O'quvchining to'lov kelishuvi — qaysi reja (1 yillik/2/3/oyma-oy), to'liq
   * jadval (har bo'lim summasi + muddati), to'langan/qolgan va "keyingi to'lov"
   * (qachon, qancha). To'lov kiritish formasi shu panelni ko'rsatadi.
   */
  async getAgreement(studentId: string): Promise<StudentAgreement | null> {
    const student = await this.students.findOne({ where: { id: studentId }, relations: { currentClass: true } });
    if (!student) return null;

    const ctx = await this.plans.getContext();
    const plan = (student.paymentPlan ?? 'monthly') as PlanCode;
    const monthlyFee = Number(student.monthlyFee) || 0;
    const discountType = (student.discountType ?? 'percent') as DiscountType;
    const discountValue = Number(student.discountValue) || 0;
    const effectiveMonthly = effectiveMonthlyFee(monthlyFee, discountType, discountValue);

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
    const row = rows.find((r) => r.planCode === plan) ?? rows.find((r) => r.planCode === 'monthly')!;

    const paidRow = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'paid')
      .where('p.student_id = :studentId', { studentId })
      .getRawOne<{ paid: string }>();
    const totalPaid = Number(paidRow?.paid) || 0;

    const { installments, nextDue } = allocateInstallments(row.schedule, totalPaid);

    return {
      studentId: student.id,
      studentName: `${student.lastName ?? ''} ${student.firstName ?? ''}`.trim() || student.studentCode,
      classId: student.currentClassId ?? null,
      className: this.classLabel(student.currentClass),
      plan: (student.paymentPlan ?? null) as PlanCode | null,
      monthlyFee,
      effectiveMonthly,
      installmentCount: row.installments,
      total: row.total,
      paid: totalPaid,
      remaining: Math.max(row.total - totalPaid, 0),
      installments: installments.map((i) => ({
        seq: i.seq,
        dueDate: i.dueDate,
        amount: i.amount,
        paid: i.paid,
        remaining: i.remaining,
        status: i.status,
      })),
      nextDue: nextDue
        ? { seq: nextDue.seq, dueDate: nextDue.dueDate, amount: nextDue.amount, remaining: nextDue.remaining }
        : null,
    };
  }
}

export interface AgreementInstallment {
  seq: number;
  dueDate: string;
  amount: number;
  paid: number;
  remaining: number;
  status: InstallmentState;
}

export interface StudentAgreement {
  studentId: string;
  studentName: string;
  classId: string | null;
  className: string | null;
  /** Tanlangan reja (null → oyma-oy). */
  plan: PlanCode | null;
  monthlyFee: number;
  effectiveMonthly: number;
  /** Bo'limlar soni (oyma-oyda akademik oylar soni). */
  installmentCount: number;
  total: number;
  paid: number;
  remaining: number;
  installments: AgreementInstallment[];
  /** Keyingi to'lov — birinchi to'lanmagan bo'lim (null → hammasi to'langan). */
  nextDue: { seq: number; dueDate: string; amount: number; remaining: number } | null;
}
