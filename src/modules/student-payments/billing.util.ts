/**
 * O'quvchi billing — sof (pure) hisob funksiyalari. UI va testlar uchun bir
 * manbadan ishlatiladi. Hech qanday I/O yo'q.
 */

export type DiscountType = 'percent' | 'amount';
export type BalanceStatus = 'debtor' | 'advance' | 'settled';

/** Chegirmadan keyingi oylik to'lov (manfiy bo'lmaydi). */
export function effectiveMonthlyFee(
  monthlyFee: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  const fee = Number(monthlyFee) || 0;
  const value = Number(discountValue) || 0;
  const discount = discountType === 'percent' ? (fee * value) / 100 : value;
  return Math.max(fee - discount, 0);
}

/**
 * To'lov hisobi boshlangan oydan `now`gacha bo'lgan oylar soni (ikkala chet
 * ham hisoblanadi — qo'shilgan oy ham, joriy oy ham). Kelajak sana → 0.
 */
export function monthsBilled(startDate: string | Date, now: Date = new Date()): number {
  const start = typeof startDate === 'string' ? new Date(`${startDate.slice(0, 10)}T00:00:00Z`) : startDate;
  if (Number.isNaN(start.getTime())) return 0;
  const months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth()) +
    1;
  return Math.max(months, 0);
}

/** Balansdan holatni aniqlaydi (kichik dumaloqlash xatolari uchun 1 so'm tolerans). */
export function balanceStatus(balance: number): BalanceStatus {
  if (balance < -1) return 'debtor';
  if (balance > 1) return 'advance';
  return 'settled';
}

export interface StudentBalanceInput {
  monthlyFee: number;
  discountType: DiscountType;
  discountValue: number;
  /** billing_start_date yoki uning o'rnida created_at. */
  billingStart: string | Date;
  /** Jami to'langan summa. */
  paid: number;
}

export interface StudentBalanceResult {
  effectiveMonthly: number;
  months: number;
  expected: number;
  paid: number;
  /** paid − expected: manfiy = qarz, musbat = avans. */
  balance: number;
  status: BalanceStatus;
}

/** Bitta o'quvchi uchun to'liq balansni hisoblaydi. */
export function computeStudentBalance(input: StudentBalanceInput, now: Date = new Date()): StudentBalanceResult {
  const effectiveMonthly = effectiveMonthlyFee(input.monthlyFee, input.discountType, input.discountValue);
  const months = monthsBilled(input.billingStart, now);
  const expected = effectiveMonthly * months;
  const paid = Number(input.paid) || 0;
  const balance = paid - expected;
  return { effectiveMonthly, months, expected, paid, balance, status: balanceStatus(balance) };
}

/* ──────────────────────────────────────────────────────────────────────────
 * To'lov rejasi (payment plan) chegirmasi — yaxlit/erta to'lov rag'bati.
 *
 * 4 reja: yillik 1 marta (eng katta chegirma) → 2 ga bo'lib → 3 ga bo'lib →
 * oyma-oy (chegirma 0, etalon). Har reja foiz YOKI so'm chegirma. Asos —
 * akademik yil oylari; yil o'rtasida qo'shilsa baza ham, so'm chegirma ham
 * qolgan oylarga mutanosib proratlanadi. Bo'lim sanalari teng oraliqda.
 * ────────────────────────────────────────────────────────────────────────── */

export type PlanCode = 'yearly_1x' | 'split_2' | 'split_3' | 'monthly';

/** Reja ustuvorligi — chegirma shu tartibda QAT'IY kamayishi kerak (invariant). */
export const PLAN_ORDER: PlanCode[] = ['yearly_1x', 'split_2', 'split_3', 'monthly'];

/** Reja kodidan standart bo'lim soni (monthly → 0 = akademik oylar soni). */
export const PLAN_INSTALLMENTS: Record<PlanCode, number> = {
  yearly_1x: 1,
  split_2: 2,
  split_3: 3,
  monthly: 0,
};

export interface PlanRate {
  planCode: PlanCode;
  discountType: DiscountType;
  discountValue: number;
}

export interface PlanConfig {
  /** Invariant validatsiyasi va preview uchun etalon oylik tarif. */
  referenceMonthlyFee: number;
  rates: PlanRate[];
}

/** "YYYY-MM-DD" yoki Date → UTC Date (kun 1ga normallashtiriladi oraliq uchun emas). */
function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
}

/** Ikki sana orasidagi oylar soni (ikkala chet ham): mas. sen→iyun = 10. */
export function monthSpanInclusive(start: string | Date, end: string | Date): number {
  const s = parseDate(start);
  const e = parseDate(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const span = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1;
  return Math.max(span, 0);
}

/** Sanaga oy qo'shadi (kun 1ga tushiriladi — bo'lim sanasi oy boshida). */
export function addMonths(date: string | Date, months: number): Date {
  const d = parseDate(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

/**
 * Reja so'm chegirmasini hisoblaydi. Foiz — (proratlangan) bazadan; so'm —
 * qat'iy qiymat, lekin yil o'rtasida qo'shilsa `prorateFactor` bilan kamayadi.
 */
export function resolvePlanDiscount(yearlyBase: number, rate: PlanRate, prorateFactor = 1): number {
  const base = Number(yearlyBase) || 0;
  const value = Number(rate.discountValue) || 0;
  const raw = rate.discountType === 'percent' ? (base * value) / 100 : value * prorateFactor;
  // Chegirma bazadan oshmasin (jami to'lov manfiy bo'lmasin).
  return Math.max(Math.min(raw, base), 0);
}

export interface PlanRatesValidation {
  ok: boolean;
  /** Buzilgan juftliklar: `${a} <= ${b}` ko'rinishida. */
  violations: string[];
}

/**
 * Invariant: chegirma(yearly_1x) > (split_2) > (split_3) > (monthly).
 * Aralash tur (foiz/so'm) bo'lgani uchun etalon baza orqali so'mga keltirib
 * solishtiriladi. Config saqlashda chaqiriladi — buzilsa saqlanmaydi.
 */
export function validatePlanRates(config: PlanConfig): PlanRatesValidation {
  const months = 1; // etalon baza = referenceMonthlyFee (oylik tariffning o'zi yetarli, nisbat saqlanadi)
  const base = (Number(config.referenceMonthlyFee) || 0) * months * 10; // 10 oylik etalon yillik baza
  const byCode = new Map(config.rates.map((r) => [r.planCode, r]));
  const resolved = PLAN_ORDER.map((code) => {
    const rate = byCode.get(code);
    return { code, som: rate ? resolvePlanDiscount(base, rate, 1) : 0 };
  });
  const violations: string[] = [];
  for (let i = 1; i < resolved.length; i += 1) {
    if (resolved[i].som >= resolved[i - 1].som) {
      violations.push(`${resolved[i].code} (${resolved[i].som}) >= ${resolved[i - 1].code} (${resolved[i - 1].som})`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export interface Installment {
  seq: number;
  /** "YYYY-MM-DD" — bo'lim to'lanishi kerak bo'lgan sana (oy boshi). */
  dueDate: string;
  amount: number;
}

export interface ScheduleInput {
  planCode: PlanCode;
  total: number;
  /** O'quvchi uchun amaldagi boshlanish sanasi (max(billingStart, akademik boshi)). */
  effectiveStart: string | Date;
  /** Hisoblanadigan oylar soni (yil o'rtasi keluvchi uchun qolgan oylar). */
  billedMonths: number;
}

/**
 * To'lov jadvali — teng oraliqda. monthly → har oy bitta bo'lim; split_N →
 * N bo'lim (lekin qolgan oydan oshmaydi); yaxlitlash oxirgi bo'limga yig'iladi.
 */
export function buildInstallmentSchedule(input: ScheduleInput): Installment[] {
  const billed = Math.max(Math.floor(input.billedMonths), 0);
  if (billed === 0) return [];
  const total = Math.max(Math.round(Number(input.total) || 0), 0);

  const desired = input.planCode === 'monthly' ? billed : PLAN_INSTALLMENTS[input.planCode];
  const count = Math.max(Math.min(desired, billed), 1);

  const baseAmount = Math.floor(total / count);
  const schedule: Installment[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i += 1) {
    // Teng oraliq: bo'limni qolgan oylar bo'ylab tarqatamiz.
    const monthOffset = count === 1 ? 0 : Math.round((i * billed) / count);
    const amount = i === count - 1 ? total - allocated : baseAmount;
    allocated += amount;
    schedule.push({
      seq: i + 1,
      dueDate: toIsoDate(addMonths(input.effectiveStart, monthOffset)),
      amount,
    });
  }
  return schedule;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface PlanComparisonInput {
  monthlyFee: number;
  discountType: DiscountType;
  discountValue: number;
  /** O'quvchining billing boshlanishi (billing_start_date ?? created_at). */
  billingStart: string | Date;
  academicStart: string | Date;
  academicEnd: string | Date;
}

export interface PlanComparisonRow {
  planCode: PlanCode;
  installments: number;
  /** Reja bo'yicha jami to'lanadigan summa (chegirmadan keyin). */
  total: number;
  /** Reja chegirmasi (so'm). */
  discount: number;
  /** Oyma-oyga nisbatan tejam (so'm) — odam shu raqamni ko'radi. */
  savingsVsMonthly: number;
  /** Tejam yillik umumiy summaning necha foizi (0–100) — "10% yutasiz". */
  savingsPercent: number;
  /** Eng arzon reja (eng ko'p tejam). */
  isCheapest: boolean;
  /** Invariant buzilib clamp qilingan bo'lsa true. */
  clamped: boolean;
  schedule: Installment[];
}

/**
 * Barcha rejalarni bitta o'quvchi uchun solishtiradi — FE "1 martada to'lasangiz
 * X so'm yutasiz" ko'rsatish uchun. Yil o'rtasi keluvchida baza/chegirma
 * proratlanadi. Monotonic clamp: o'quvchi hech qachon teskari rag'bat ko'rmaydi.
 */
export function comparePlans(input: PlanComparisonInput, config: PlanConfig): PlanComparisonRow[] {
  const effMonthly = effectiveMonthlyFee(input.monthlyFee, input.discountType, input.discountValue);
  const totalMonths = monthSpanInclusive(input.academicStart, input.academicEnd);

  // Amaldagi boshlanish = max(billingStart, akademik boshi).
  const billingStart = parseDate(input.billingStart);
  const academicStart = parseDate(input.academicStart);
  const effectiveStart = billingStart.getTime() > academicStart.getTime() ? billingStart : academicStart;
  const billedMonths = monthSpanInclusive(effectiveStart, input.academicEnd);
  const prorateFactor = totalMonths > 0 ? billedMonths / totalMonths : 0;

  const yearlyBase = effMonthly * billedMonths;
  const byCode = new Map(config.rates.map((r) => [r.planCode, r]));

  // 1. Xom chegirmani hisoblaymiz.
  const raw = PLAN_ORDER.map((code) => {
    const rate = byCode.get(code) ?? { planCode: code, discountType: 'amount' as DiscountType, discountValue: 0 };
    return { code, discount: resolvePlanDiscount(yearlyBase, rate, prorateFactor) };
  });

  // 2. Monotonic clamp — chegirma ustuvorlik tartibida qat'iy kamayishi shart.
  let prev = Number.POSITIVE_INFINITY;
  const clamped = raw.map(({ code, discount }) => {
    let value = discount;
    let wasClamped = false;
    if (value >= prev) {
      value = Math.max(prev - 1, 0);
      wasClamped = true;
    }
    prev = value;
    return { code, discount: value, wasClamped };
  });

  // 3. monthly etalon — uning to'lovi vs har reja.
  const monthlyDiscount = clamped.find((r) => r.code === 'monthly')?.discount ?? 0;
  const monthlyTotal = Math.max(yearlyBase - monthlyDiscount, 0);

  const rows: PlanComparisonRow[] = clamped.map(({ code, discount, wasClamped }) => {
    const total = Math.max(yearlyBase - discount, 0);
    const installments = code === 'monthly' ? billedMonths : Math.min(PLAN_INSTALLMENTS[code], Math.max(billedMonths, 1));
    const savingsVsMonthly = monthlyTotal - total;
    return {
      planCode: code,
      installments,
      total,
      discount,
      savingsVsMonthly,
      // Yutuq etalon (oyma-oy) summasidan necha foiz — UI "10% yutasiz" ko'rsatadi.
      savingsPercent: monthlyTotal > 0 ? (savingsVsMonthly / monthlyTotal) * 100 : 0,
      isCheapest: false,
      clamped: wasClamped,
      schedule: buildInstallmentSchedule({ planCode: code, total, effectiveStart, billedMonths }),
    };
  });

  // 4. Eng arzon rejani belgilaymiz.
  const min = Math.min(...rows.map((r) => r.total));
  for (const row of rows) {
    if (row.total === min) {
      row.isCheapest = true;
      break;
    }
  }
  return rows;
}

export type InstallmentState = 'paid' | 'partial' | 'pending';

export interface InstallmentStatus extends Installment {
  /** Shu bo'limga taqsimlangan to'lov. */
  paid: number;
  /** Qolgan (amount − paid). */
  remaining: number;
  status: InstallmentState;
}

export interface AllocationResult {
  installments: InstallmentStatus[];
  /** Birinchi to'liq to'lanmagan bo'lim (keyingi to'lov) — barchasi to'langan bo'lsa null. */
  nextDue: InstallmentStatus | null;
}

/**
 * To'langan jami summani bo'limlarga ketma-ket (waterfall) taqsimlaydi: avval
 * 1-bo'lim to'liq, keyin 2-bo'lim va h.k. Har bo'lim holati va "keyingi to'lov"
 * (birinchi to'lanmagan bo'lim) aniqlanadi. UI "keyingi to'lov: qachon, qancha"
 * ko'rsatish uchun ishlatadi.
 */
export function allocateInstallments(schedule: Installment[], totalPaid: number): AllocationResult {
  let remainingMoney = Math.max(Number(totalPaid) || 0, 0);
  const installments: InstallmentStatus[] = schedule.map((inst) => {
    const amount = Math.max(Number(inst.amount) || 0, 0);
    const paid = Math.min(remainingMoney, amount);
    remainingMoney -= paid;
    const remaining = Math.max(amount - paid, 0);
    const status: InstallmentState = remaining <= 1 ? 'paid' : paid > 0 ? 'partial' : 'pending';
    return { ...inst, amount, paid, remaining, status };
  });
  const nextDue = installments.find((i) => i.status !== 'paid') ?? null;
  return { installments, nextDue };
}

/** Jadvaldagi muddati kelgan (dueDate ≤ now) bo'limlar yig'indisi. */
export function expectedToDate(schedule: Installment[], now: Date = new Date()): number {
  const nowTime = now.getTime();
  return schedule.reduce((sum, inst) => {
    const due = new Date(`${inst.dueDate}T00:00:00Z`).getTime();
    return due <= nowTime ? sum + inst.amount : sum;
  }, 0);
}

export interface PlanBalanceInput extends PlanComparisonInput {
  planCode: PlanCode;
  paid: number;
}

export interface PlanBalanceResult extends StudentBalanceResult {
  planCode: PlanCode;
  /** Reja bo'yicha yillik jami to'lov (chegirmadan keyin). */
  planTotal: number;
  schedule: Installment[];
}

/**
 * Reja-aware balans — kutilgan summa tanlangan reja jadvalidagi muddati kelgan
 * bo'limlardan olinadi (oyma-oy bilan bir xil, lekin yaxlit/bo'lib to'lashda
 * to'g'ri ishlaydi). monthly reja → mavjud oyma-oy xulqi bilan ustma-ust tushadi.
 */
export function computePlanBalance(
  input: PlanBalanceInput,
  config: PlanConfig,
  now: Date = new Date(),
): PlanBalanceResult {
  const rows = comparePlans(input, config);
  const row = rows.find((r) => r.planCode === input.planCode) ?? rows.find((r) => r.planCode === 'monthly')!;
  const expected = expectedToDate(row.schedule, now);
  const paid = Number(input.paid) || 0;
  const balance = paid - expected;
  return {
    planCode: row.planCode,
    planTotal: row.total,
    schedule: row.schedule,
    effectiveMonthly: effectiveMonthlyFee(input.monthlyFee, input.discountType, input.discountValue),
    months: row.schedule.filter((i) => new Date(`${i.dueDate}T00:00:00Z`).getTime() <= now.getTime()).length,
    expected,
    paid,
    balance,
    status: balanceStatus(balance),
  };
}
