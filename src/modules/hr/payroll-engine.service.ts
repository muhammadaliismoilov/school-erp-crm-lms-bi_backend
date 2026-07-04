import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { ClassSession } from '../attendance/entities/class-session.entity';
import { StaffAttendanceRecord } from '../attendance/entities/staff-attendance-record.entity';
import { PayrollRunQueryDto } from './dto/payroll-run.dto';
import { ClassLeaderAssignment } from './entities/class-leader-assignment.entity';
import { HrPayment } from './entities/hr-payment.entity';
import { PayRateCard } from './entities/pay-rate-card.entity';
import { Payroll } from './entities/payroll.entity';
import { PayrollAdjustment } from './entities/payroll-adjustment.entity';
import { PayrollItem } from './entities/payroll-item.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffMember } from './entities/staff-member.entity';
import { Teacher } from './entities/teacher.entity';
import {
  EmploymentStatus,
  HrPaymentStatus,
  LeaveStatus,
  LeaveType,
  PayrollAdjustmentType,
  PayrollItemType,
  PayrollStatus,
  QualificationCategory,
  StaffKpiMode,
} from './enums/hr.enums';
import { PayrollConfigService } from './payroll-config.service';
import { HolidayService } from './holiday.service';

// ─── Javob shakllari ────────────────────────────────────────────────────────

export interface PayrollRunItemView {
  type: PayrollItemType;
  quantity: number | null;
  rate: number | null;
  amount: number;
  note: string | null;
}

export interface PayrollRunView {
  id: string;
  staffMemberId: string;
  staffName: string | null;
  positionTitle: string | null;
  period: string;
  status: PayrollStatus;
  baseAmount: number;
  bonus: number;
  deduction: number;
  netAmount: number;
  items: PayrollRunItemView[];
}

export interface GenerateRunSummary {
  period: string;
  totalStaff: number;
  calculated: number;
  skippedNonDraft: number;
  warnings: string[];
}

// ─── Hisoblash konteksti (bir davr uchun bir marta yuklanadi) ───────────────

/** To'lanadigan ta'til turlari (Mehnat kodeksi: kasallik/ta'til to'lanadi). */
const PAID_LEAVE_TYPES = new Set<LeaveType>([
  LeaveType.ANNUAL,
  LeaveType.SICK,
  LeaveType.MATERNITY,
  LeaveType.PATERNITY,
  LeaveType.STUDY,
]);

/** Turniketda "kelgan" deb hisoblanadigan statuslar. */
const PRESENT_STATUSES = new Set<AttendanceStatus>([
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.LEFT_EARLY,
  AttendanceStatus.EXCUSED,
]);

export interface PeriodContext {
  period: string;
  monthStart: string;
  monthEnd: string;
  daysInMonth: number;
  /** Ish kunlari (yakshanba va bayramlardan tashqari) — ISO sanalar ro'yxati. */
  workdays: string[];
  settings: { classLeaderRate: number; maxClassLeaderships: number };
  /** teacher.staffMemberId → Teacher */
  teacherByStaff: Map<string, Teacher>;
  /** payee teacherId → tasdiqlangan sessiyalar sanalari */
  sessionsByTeacher: Map<string, string[]>;
  /** userId → "kelgan" sanalar to'plami */
  attendanceByUser: Map<string, Set<string>>;
  /** userId bo'yicha: oyda umuman yozuv bormi (ma'lumot yetarliligi belgisi) */
  hasAnyAttendance: Set<string>;
  /** staffMemberId → tasdiqlangan ta'tillar */
  leavesByStaff: Map<string, StaffLeave[]>;
  /** teacherId → rahbarlik biriktiruvlari (sinf nomi bilan) */
  assignmentsByTeacher: Map<string, ClassLeaderAssignment[]>;
  /** staffMemberId → tuzatish yozuvlari */
  adjustmentsByStaff: Map<string, PayrollAdjustment[]>;
  /** Toifa stavkalari (yangi→eski tartibda) — sana bo'yicha yechish uchun. */
  rateCards: PayRateCard[];
}

/** Hisoblangan komponent qatori (saqlashdan oldingi shakl). */
interface ComputedItem {
  type: PayrollItemType;
  quantity?: number | null;
  rate?: number | null;
  amount: number;
  note?: string | null;
  sourceRef?: Record<string, unknown> | null;
}

/**
 * Oylik hisoblash dvigateli. Printsiplar:
 *  - faqat AMALDA O'TILGAN (CONFIRMED) darslar to'lanadi; CANCELLED — yo'q;
 *  - o'rinbosar tasdiqlagan dars puli o'rinbosarga (confirmedByTeacherId);
 *  - sinf rahbarligi kunlar bo'yicha PROPORTSIONAL;
 *  - stavkalar hisoblash paytida qatorga SNAPSHOT qilinadi;
 *  - qayta hisoblash faqat Qoralama holatida (idempotent);
 *  - holat mashinasi: draft → pending_approval → approved → paid → locked.
 */
@Injectable()
export class PayrollEngineService {
  constructor(
    @InjectRepository(Payroll) private readonly payrolls: Repository<Payroll>,
    @InjectRepository(PayrollItem) private readonly items: Repository<PayrollItem>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(ClassSession) private readonly sessions: Repository<ClassSession>,
    @InjectRepository(StaffAttendanceRecord) private readonly staffAttendance: Repository<StaffAttendanceRecord>,
    @InjectRepository(StaffLeave) private readonly leaves: Repository<StaffLeave>,
    @InjectRepository(ClassLeaderAssignment) private readonly assignments: Repository<ClassLeaderAssignment>,
    @InjectRepository(PayrollAdjustment) private readonly adjustments: Repository<PayrollAdjustment>,
    @InjectRepository(PayRateCard) private readonly rateCards: Repository<PayRateCard>,
    @InjectRepository(HrPayment) private readonly payments: Repository<HrPayment>,
    private readonly config: PayrollConfigService,
    private readonly holidays: HolidayService,
    private readonly tenant: TenantContextService,
  ) {}

  // ─── Ommaviy API ──────────────────────────────────────────────────────────

  /** Davr uchun barcha faol xodimlarga qoralama oylik yaratadi/qayta hisoblaydi. */
  async generateForPeriod(period: string): Promise<GenerateRunSummary> {
    const ctx = await this.buildContext(period);
    const staffList = await this.staff.find({
      where: {
        ...tenantWhere<StaffMember>(this.tenant, {}, { branch: true }),
        status: In([EmploymentStatus.ACTIVE, EmploymentStatus.ON_LEAVE]),
        hireDate: LessThanOrEqual(ctx.monthEnd),
      },
    });

    const warnings: string[] = [];
    let calculated = 0;
    let skipped = 0;

    for (const member of staffList) {
      const existing = await this.payrolls.findOne({
        where: tenantWhere<Payroll>(this.tenant, { staffMemberId: member.id, period }, { branch: true }),
      });
      if (existing && existing.status !== PayrollStatus.DRAFT) {
        skipped += 1;
        continue;
      }
      const { items, warnings: w } = this.computeItems(member, ctx);
      warnings.push(...w.map((msg) => `${member.lastName} ${member.firstName}: ${msg}`));
      await this.persist(member, period, items, existing);
      calculated += 1;
    }

    return { period, totalStaff: staffList.length, calculated, skippedNonDraft: skipped, warnings };
  }

  /** Bitta oylikni qayta hisoblash (faqat Qoralama). */
  async recalculate(payrollId: string): Promise<PayrollRunView> {
    const payroll = await this.getPayroll(payrollId);
    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Faqat Qoralama holatidagi oylik qayta hisoblanadi');
    }
    const member = await this.staff.findOne({
      where: tenantWhere<StaffMember>(this.tenant, { id: payroll.staffMemberId }, { branch: true }),
    });
    if (!member) throw new NotFoundException('Xodim topilmadi');
    const ctx = await this.buildContext(payroll.period);
    const { items } = this.computeItems(member, ctx);
    await this.persist(member, payroll.period, items, payroll);
    return this.getView(payrollId);
  }

  async find(query: PayrollRunQueryDto): Promise<PayrollRunView[]> {
    const where = tenantWhere<Payroll>(this.tenant, {}, { branch: true });
    if (query.period) (where as Record<string, unknown>).period = query.period;
    if (query.staffMemberId) (where as Record<string, unknown>).staffMemberId = query.staffMemberId;
    if (query.status) (where as Record<string, unknown>).status = query.status;
    const rows = await this.payrolls.find({
      where,
      relations: { staffMember: { position: true }, items: true },
      order: { period: 'DESC', createdAt: 'ASC' },
    });
    return rows.map((p) => this.toView(p));
  }

  async getView(id: string): Promise<PayrollRunView> {
    const payroll = await this.payrolls.findOne({
      where: tenantWhere<Payroll>(this.tenant, { id }, { branch: true }),
      relations: { staffMember: { position: true }, items: true },
    });
    if (!payroll) throw new NotFoundException('Oylik topilmadi');
    return this.toView(payroll);
  }

  // ─── Holat mashinasi ──────────────────────────────────────────────────────

  private static readonly TRANSITIONS: Record<string, { from: PayrollStatus; to: PayrollStatus }> = {
    submit: { from: PayrollStatus.DRAFT, to: PayrollStatus.PENDING_APPROVAL },
    reject: { from: PayrollStatus.PENDING_APPROVAL, to: PayrollStatus.DRAFT },
    approve: { from: PayrollStatus.PENDING_APPROVAL, to: PayrollStatus.APPROVED },
    'mark-paid': { from: PayrollStatus.APPROVED, to: PayrollStatus.PAID },
    lock: { from: PayrollStatus.PAID, to: PayrollStatus.LOCKED },
  };

  async transition(payrollId: string, action: string): Promise<PayrollRunView> {
    const rule = PayrollEngineService.TRANSITIONS[action];
    if (!rule) throw new BadRequestException(`Noma'lum amal: ${action}`);
    const payroll = await this.getPayroll(payrollId);
    if (payroll.status !== rule.from) {
      throw new BadRequestException(
        `"${action}" faqat "${rule.from}" holatidan mumkin (hozirgi: "${payroll.status}")`,
      );
    }
    payroll.status = rule.to;
    await this.payrolls.save(payroll);

    // To'landi deb belgilanganda to'lovlar tarixida avtomatik yozuv paydo
    // bo'ladi (netto summa). Idempotent — bir payroll uchun bitta yozuv.
    if (rule.to === PayrollStatus.PAID) {
      await this.createPaymentRecord(payroll);
    }
    return this.getView(payrollId);
  }

  /** Oylik to'lovi uchun HrPayment yozuvi (note ichida payroll ID — dublikat oldini oladi). */
  private async createPaymentRecord(payroll: Payroll): Promise<void> {
    const marker = `payroll:${payroll.id}`;
    const exists = await this.payments
      .createQueryBuilder('p')
      .where('p.deleted_at IS NULL')
      .andWhere('p.note LIKE :m', { m: `%${marker}%` })
      .getCount();
    if (exists > 0) return;
    await this.payments.save(
      this.payments.create({
        staffMemberId: payroll.staffMemberId,
        amount: Number(payroll.netAmount),
        paymentDate: new Date().toISOString().slice(0, 10),
        status: HrPaymentStatus.PAID,
        note: `${payroll.period} oyligi (avtomatik, ${marker})`,
      }),
    );
  }

  /** Xodimning O'Z payslip'lari (login user bo'yicha) — faqat tasdiqlangandan keyingi holatlar. */
  async findMine(userId: string): Promise<PayrollRunView[]> {
    const member = await this.staff.findOne({
      where: tenantWhere<StaffMember>(this.tenant, { userId }, { branch: true }),
    });
    if (!member) return [];
    const rows = await this.payrolls.find({
      where: {
        ...tenantWhere<Payroll>(this.tenant, {}, { branch: true }),
        staffMemberId: member.id,
        status: In([PayrollStatus.APPROVED, PayrollStatus.PAID, PayrollStatus.LOCKED]),
      },
      relations: { staffMember: { position: true }, items: true },
      order: { period: 'DESC' },
    });
    return rows.map((p) => this.toView(p));
  }

  // ─── Kontekst yig'ish ─────────────────────────────────────────────────────

  async buildContext(period: string): Promise<PeriodContext> {
    const [yearStr, monthStr] = period.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthStart = `${period}-01`;
    const monthEnd = `${period}-${String(daysInMonth).padStart(2, '0')}`;

    const holidaySet = await this.holidays.datesBetween(monthStart, monthEnd);
    const workdays: string[] = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = `${period}-${String(d).padStart(2, '0')}`;
      const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
      // Yakshanba — dam olish kuni (maktablar 6 kunlik ish haftasi); bayramlar kalendari qo'shimcha.
      if (weekday === 0 || holidaySet.has(iso)) continue;
      workdays.push(iso);
    }

    const settings = await this.config.currentSettings();

    const teacherList = await this.teachers.find({
      where: tenantWhere<Teacher>(this.tenant, {}, { branch: true }),
    });
    const teacherByStaff = new Map(teacherList.map((t) => [t.staffMemberId, t]));

    // Faqat tasdiqlangan (amalda o'tilgan) sessiyalar. O'rinbosar tasdiqlagan
    // bo'lsa pul unga — payee = confirmedByTeacherId ?? teacherId.
    const confirmed = await this.sessions.find({
      where: {
        ...tenantWhere<ClassSession>(this.tenant, {}, { branch: true }),
        date: Between(monthStart, monthEnd),
        status: SessionStatus.CONFIRMED,
      },
    });
    const sessionsByTeacher = new Map<string, string[]>();
    for (const s of confirmed) {
      const payee = s.confirmedByTeacherId ?? s.teacherId;
      if (!payee) continue;
      const list = sessionsByTeacher.get(payee) ?? [];
      list.push(s.date);
      sessionsByTeacher.set(payee, list);
    }

    const attendance = await this.staffAttendance.find({
      where: {
        ...tenantWhere<StaffAttendanceRecord>(this.tenant, {}, { branch: true }),
        date: Between(monthStart, monthEnd),
      },
    });
    const attendanceByUser = new Map<string, Set<string>>();
    const hasAnyAttendance = new Set<string>();
    for (const rec of attendance) {
      hasAnyAttendance.add(rec.userId);
      if (!PRESENT_STATUSES.has(rec.status)) continue;
      const set = attendanceByUser.get(rec.userId) ?? new Set<string>();
      set.add(rec.date);
      attendanceByUser.set(rec.userId, set);
    }

    const approvedLeaves = await this.leaves.find({
      where: {
        ...tenantWhere<StaffLeave>(this.tenant, {}, { branch: true }),
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(monthEnd),
        endDate: MoreThanOrEqual(monthStart),
      },
    });
    const leavesByStaff = new Map<string, StaffLeave[]>();
    for (const leave of approvedLeaves) {
      const list = leavesByStaff.get(leave.staffMemberId) ?? [];
      list.push(leave);
      leavesByStaff.set(leave.staffMemberId, list);
    }

    const assignmentList = await this.assignments.find({
      where: [
        {
          ...tenantWhere<ClassLeaderAssignment>(this.tenant, {}, { branch: true }),
          startDate: LessThanOrEqual(monthEnd),
          endDate: IsNull(),
        },
        {
          ...tenantWhere<ClassLeaderAssignment>(this.tenant, {}, { branch: true }),
          startDate: LessThanOrEqual(monthEnd),
          endDate: MoreThanOrEqual(monthStart),
        },
      ],
      relations: { schoolClass: true },
    });
    const assignmentsByTeacher = new Map<string, ClassLeaderAssignment[]>();
    for (const a of assignmentList) {
      const list = assignmentsByTeacher.get(a.teacherId) ?? [];
      list.push(a);
      assignmentsByTeacher.set(a.teacherId, list);
    }

    const adjustmentList = await this.adjustments.find({
      where: { ...tenantWhere<PayrollAdjustment>(this.tenant, {}, { branch: true }), period },
    });
    const adjustmentsByStaff = new Map<string, PayrollAdjustment[]>();
    for (const adj of adjustmentList) {
      const list = adjustmentsByStaff.get(adj.staffMemberId) ?? [];
      list.push(adj);
      adjustmentsByStaff.set(adj.staffMemberId, list);
    }

    const cards = await this.rateCards.find({
      where: tenantWhere<PayRateCard>(this.tenant, {}, { branch: true }),
      order: { effectiveFrom: 'DESC' },
    });

    return {
      period,
      monthStart,
      monthEnd,
      daysInMonth,
      workdays,
      settings,
      teacherByStaff,
      sessionsByTeacher,
      attendanceByUser,
      hasAnyAttendance,
      leavesByStaff,
      assignmentsByTeacher,
      adjustmentsByStaff,
      rateCards: cards,
    };
  }

  // ─── Bitta xodim uchun komponentlar (sof hisob — testlanadigan) ───────────

  computeItems(member: StaffMember, ctx: PeriodContext): { items: ComputedItem[]; warnings: string[] } {
    const items: ComputedItem[] = [];
    const warnings: string[] = [];
    const teacher = ctx.teacherByStaff.get(member.id);

    // 1) BAZA OKLAD + sababsiz kunlar ushlab qolinishi.
    const salary = Number(member.salary) || 0;
    if (salary > 0) {
      const workdayCount = ctx.workdays.length;
      const dailyRate = round2(salary / Math.max(workdayCount, 1));
      items.push({
        type: PayrollItemType.BASE_SALARY,
        quantity: workdayCount,
        rate: dailyRate,
        amount: salary,
        note: `Oklad (${workdayCount} ish kuni)`,
      });

      const userId = member.userId ?? null;
      const attended = userId ? ctx.attendanceByUser.get(userId) : undefined;
      const hasData = userId ? ctx.hasAnyAttendance.has(userId) : false;
      const staffLeaves = ctx.leavesByStaff.get(member.id) ?? [];

      if (!hasData && staffLeaves.length === 0) {
        // Turniket ma'lumoti umuman yo'q — jarima qilmaymiz (ma'lumot yetarli emas).
        if (userId) warnings.push('davomat (turniket) ma\'lumoti topilmadi — ushlab qolish hisoblanmadi');
      } else {
        let missed = 0;
        let unpaidLeaveDays = 0;
        for (const day of ctx.workdays) {
          if (attended?.has(day)) continue;
          const leave = staffLeaves.find((l) => l.startDate <= day && l.endDate >= day);
          if (leave) {
            if (PAID_LEAVE_TYPES.has(leave.type)) continue; // to'lanadigan ta'til
            unpaidLeaveDays += 1;
            continue;
          }
          missed += 1;
        }
        const deductDays = missed + unpaidLeaveDays;
        if (deductDays > 0) {
          items.push({
            type: PayrollItemType.ABSENCE_DEDUCTION,
            quantity: deductDays,
            rate: dailyRate,
            amount: -round2(dailyRate * deductDays),
            note:
              unpaidLeaveDays > 0
                ? `Sababsiz: ${missed} kun, ish haqisiz ta'til: ${unpaidLeaveDays} kun`
                : `Sababsiz kelmagan: ${missed} kun`,
          });
        }
      }
    }

    // 2) DARS HAQI (faqat o'qituvchi): tasdiqlangan sessiyalar × toifa stavkasi.
    if (teacher) {
      const dates = ctx.sessionsByTeacher.get(teacher.id) ?? [];
      if (dates.length > 0) {
        // Stavka har sessiya sanasi bo'yicha yechiladi (oy o'rtasida o'zgargan
        // bo'lsa ikkala stavka ham to'g'ri qo'llanadi) va qatorga snapshot bo'ladi.
        const byRate = new Map<number, number>();
        let fallbackUsed = false;
        for (const date of dates) {
          let rate = this.resolveFromCards(ctx.rateCards, member.qualificationCategory ?? null, date);
          if (rate === null) {
            rate = Number(teacher.ratePerLesson) || 0;
            fallbackUsed = true;
          }
          byRate.set(rate, (byRate.get(rate) ?? 0) + 1);
        }
        if (fallbackUsed) {
          warnings.push(
            member.qualificationCategory
              ? 'toifa stavkasi jadvalda topilmadi — o\'qituvchining shaxsiy stavkasi ishlatildi'
              : 'malaka toifasi kiritilmagan — shaxsiy stavka ishlatildi',
          );
        }
        for (const [rate, count] of byRate) {
          items.push({
            type: PayrollItemType.LESSON_PAY,
            quantity: count,
            rate,
            amount: round2(rate * count),
            note: `O'tilgan darslar: ${count} × ${rate}`,
          });
        }
      }
    }

    // 3) SINF RAHBARLIGI — kunlar bo'yicha proporsional.
    if (teacher) {
      const assignmentList = ctx.assignmentsByTeacher.get(teacher.id) ?? [];
      const rate = Number(ctx.settings.classLeaderRate) || 0;
      if (assignmentList.length > 0 && rate > 0) {
        for (const a of assignmentList) {
          const from = a.startDate > ctx.monthStart ? a.startDate : ctx.monthStart;
          const to = a.endDate && a.endDate < ctx.monthEnd ? a.endDate : ctx.monthEnd;
          if (from > to) continue;
          const days = diffDaysInclusive(from, to);
          const amount = round2((rate * days) / ctx.daysInMonth);
          items.push({
            type: PayrollItemType.CLASS_LEADER,
            quantity: days,
            rate,
            amount,
            note: `Sinf rahbarligi${a.schoolClass?.name ? ` (${a.schoolClass.name})` : ''}: ${days}/${ctx.daysInMonth} kun`,
            sourceRef: { assignmentId: a.id },
          });
        }
      }
    }

    // 4) KPI bonusi — har xodimga alohida (foiz yoki qat'iy summa).
    if (member.kpiMode) {
      const positiveBase = items
        .filter((i) => i.amount > 0)
        .reduce((sum, i) => sum + i.amount, 0);
      const value = Number(member.kpiValue) || 0;
      const amount =
        member.kpiMode === StaffKpiMode.PERCENT ? round2((positiveBase * value) / 100) : round2(value);
      if (amount > 0) {
        items.push({
          type: PayrollItemType.KPI_BONUS,
          quantity: null,
          rate: member.kpiMode === StaffKpiMode.PERCENT ? value : null,
          amount,
          note: member.kpiMode === StaffKpiMode.PERCENT ? `KPI: ${value}% baza` : 'KPI: qat\'iy summa',
        });
      }
    }

    // 5) Qo'lda bonus/jarima.
    for (const adj of ctx.adjustmentsByStaff.get(member.id) ?? []) {
      const amount = Number(adj.amount) || 0;
      if (adj.type === PayrollAdjustmentType.BONUS) {
        items.push({
          type: PayrollItemType.MANUAL_BONUS,
          amount: round2(amount),
          note: adj.reason,
          sourceRef: { adjustmentId: adj.id },
        });
      } else {
        items.push({
          type: PayrollItemType.PENALTY,
          amount: -round2(amount),
          note: adj.reason,
          sourceRef: { adjustmentId: adj.id },
        });
      }
    }

    return { items, warnings };
  }

  // ─── Saqlash ──────────────────────────────────────────────────────────────

  private async persist(
    member: StaffMember,
    period: string,
    computed: ComputedItem[],
    existing: Payroll | null,
  ): Promise<Payroll> {
    const positives = computed.filter((i) => i.amount > 0);
    const negatives = computed.filter((i) => i.amount < 0);
    const bonus = round2(
      positives
        .filter((i) => i.type === PayrollItemType.KPI_BONUS || i.type === PayrollItemType.MANUAL_BONUS)
        .reduce((s, i) => s + i.amount, 0),
    );
    const baseAmount = round2(positives.reduce((s, i) => s + i.amount, 0) - bonus);
    const deduction = round2(Math.abs(negatives.reduce((s, i) => s + i.amount, 0)));
    const netAmount = round2(computed.reduce((s, i) => s + i.amount, 0));

    const payroll = existing ?? this.payrolls.create({ staffMemberId: member.id, period });
    payroll.baseAmount = baseAmount;
    payroll.bonus = bonus;
    payroll.deduction = deduction;
    payroll.netAmount = netAmount;
    payroll.status = PayrollStatus.DRAFT;
    const saved = await this.payrolls.save(payroll);

    // Qoralama qayta hisoblanganda eski qatorlar to'liq almashtiriladi.
    await this.items.delete({ payrollId: saved.id });
    if (computed.length > 0) {
      await this.items.save(
        computed.map((i) =>
          this.items.create({
            payrollId: saved.id,
            type: i.type,
            quantity: i.quantity ?? null,
            rate: i.rate ?? null,
            amount: i.amount,
            note: i.note ?? null,
            sourceRef: i.sourceRef ?? null,
          }),
        ),
      );
    }
    return saved;
  }

  // ─── Helperlar ────────────────────────────────────────────────────────────

  /** Yuklangan kartalardan sana bo'yicha stavka (yangi→eski tartiblangan). */
  private resolveFromCards(
    cards: PayRateCard[],
    category: QualificationCategory | null,
    date: string,
  ): number | null {
    if (!category) return null;
    const hit = cards.find((c) => c.category === category && c.effectiveFrom <= date);
    return hit ? Number(hit.ratePerLesson) : null;
  }

  private async getPayroll(id: string): Promise<Payroll> {
    const payroll = await this.payrolls.findOne({
      where: tenantWhere<Payroll>(this.tenant, { id }, { branch: true }),
    });
    if (!payroll) throw new NotFoundException('Oylik topilmadi');
    return payroll;
  }

  private toView(p: Payroll): PayrollRunView {
    const sm = p.staffMember;
    return {
      id: p.id,
      staffMemberId: p.staffMemberId,
      staffName: sm ? `${sm.lastName} ${sm.firstName}`.trim() : null,
      positionTitle: sm?.position?.title ?? null,
      period: p.period,
      status: p.status,
      baseAmount: Number(p.baseAmount),
      bonus: Number(p.bonus),
      deduction: Number(p.deduction),
      netAmount: Number(p.netAmount),
      items: (p.items ?? [])
        .filter((i) => !i.deletedAt)
        .map((i) => ({
          type: i.type,
          quantity: i.quantity !== null && i.quantity !== undefined ? Number(i.quantity) : null,
          rate: i.rate !== null && i.rate !== undefined ? Number(i.rate) : null,
          amount: Number(i.amount),
          note: i.note ?? null,
        })),
    };
  }
}

// ─── Sana yordamchilari ──────────────────────────────────────────────────────

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Ikkala chekka kun ham kiradi (masalan 01..15 = 15 kun). */
function diffDaysInclusive(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000) + 1;
}
