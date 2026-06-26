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
