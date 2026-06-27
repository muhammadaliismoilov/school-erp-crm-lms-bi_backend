/**
 * Qarzlar (debts) — sof (pure) hisob funksiyalari. Oylik matritsa, oylik
 * taqsimot agregati va balans xulosasi. Hech qanday I/O yo'q — UI va testlar
 * uchun yagona manba. Kutilgan summa reja jadvalidan, to'langan summa
 * `StudentPayment` qatorlaridan keladi (xizmat qatlamida yuklanadi).
 */

export type DebtCellStatus = 'paid' | 'partial' | 'pending';

/** Akademik oynadagi bitta oy (1–12 month, to'liq yil). */
export interface MonthKey {
  year: number;
  /** 1–12. */
  month: number;
}

/** Bitta o'quvchining bitta oyidagi holati (matritsa katakchasi). */
export interface DebtCell extends MonthKey {
  /** Reja bo'yicha shu oyga kutilgan summa. */
  expected: number;
  /** Shu oyda to'langan summa (StudentPayment.amount yig'indisi). */
  paid: number;
  /** Shu oyga tegishli chegirma summasi (tarif − effektiv). */
  discount: number;
  /** Muddati kelganmi (oy boshi ≤ now). Faqat muddati kelgan oy qarzga kiradi. */
  due: boolean;
  status: DebtCellStatus;
}

/** Bitta o'quvchi balans xulosasi (uch yo'nalish). */
export interface StudentDebtSummary {
  /** Maktab ota-ona oldida qarzi (+) — o'quvchi ortiqcha to'lagan (avans). */
  schoolOwes: number;
  /** Ota-ona maktab oldida qarzi (−, musbat son sifatida) — qoldiq qarz. */
  parentOwes: number;
  /** Real balans = schoolOwes − parentOwes (musbat = avans, manfiy = qarz). */
  realBalance: number;
}

/** Oylik taqsimot bitta qatori (barcha o'quvchilar bo'yicha). */
export interface MonthlyAggregate extends MonthKey {
  expected: number;
  collected: number;
  remaining: number;
  discount: number;
  /** Yig'ish foizi: collected / expected × 100 (0–100). */
  collectionRate: number;
  fullyPaid: number;
  partiallyPaid: number;
  unpaid: number;
}

/** "YYYY-MM-DD"/Date → UTC Date (oy boshiga normallashtiriladi). */
function toMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
}

/**
 * Akademik oyna ([start, end]) ichidagi oylar ro'yxati (ikkala chet ham).
 * Mas. 2025-09-01 → 2026-06-30 = Sen 2025 … Iyun 2026 (10 oy).
 */
export function buildMonthAxis(start: string | Date, end: string | Date): MonthKey[] {
  const s = parseDate(start);
  const e = parseDate(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return [];
  const axis: MonthKey[] = [];
  let y = s.getUTCFullYear();
  let m = s.getUTCMonth() + 1;
  const endY = e.getUTCFullYear();
  const endM = e.getUTCMonth() + 1;
  // Xavfsizlik chegarasi (cheksiz tsikldan saqlanish) — 60 oy.
  for (let i = 0; i < 60; i += 1) {
    axis.push({ year: y, month: m });
    if (y === endY && m === endM) break;
    if (y > endY || (y === endY && m >= endM)) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return axis;
}

/** Katakcha holati: to'liq / qisman / kutilmoqda. */
export function cellStatus(expected: number, paid: number): DebtCellStatus {
  const exp = Number(expected) || 0;
  const pd = Number(paid) || 0;
  if (exp <= 0) return pd > 0 ? 'paid' : 'pending';
  if (pd >= exp - 1) return 'paid'; // 1 so'm dumaloqlash toleransi
  if (pd > 0) return 'partial';
  return 'pending';
}

export interface CellInput {
  expected: number;
  paid: number;
  discount: number;
}

/**
 * Bitta o'quvchining oylik matritsasini quradi. `expectedByMonth`/`paidByMonth`/
 * `discountByMonth` — `"YYYY-MM"` kalitli mate. `now` — muddat chegarasi.
 */
export function buildStudentCells(
  axis: MonthKey[],
  byMonth: (key: MonthKey) => CellInput,
  now: Date = new Date(),
): DebtCell[] {
  const nowTime = now.getTime();
  return axis.map((k) => {
    const { expected, paid, discount } = byMonth(k);
    const due = toMonthStart(k.year, k.month).getTime() <= nowTime;
    return {
      ...k,
      expected: Number(expected) || 0,
      paid: Number(paid) || 0,
      discount: Number(discount) || 0,
      due,
      status: cellStatus(expected, paid),
    };
  });
}

/**
 * O'quvchi balans xulosasi — faqat muddati kelgan oylar bo'yicha.
 * Ortiqcha to'lov (paid > expected) → maktab qarzi (avans); kam to'lov → ota-ona qarzi.
 */
export function summarizeStudent(cells: DebtCell[]): StudentDebtSummary {
  let schoolOwes = 0;
  let parentOwes = 0;
  for (const c of cells) {
    if (c.due) {
      const diff = c.paid - c.expected; // + avans, − qarz
      if (diff > 0) schoolOwes += diff;
      else if (diff < 0) parentOwes += -diff;
    } else if (c.paid > 0) {
      // Muddati kelmagan oyga to'lov — oldindan (avans), maktab xizmat qarzdor.
      schoolOwes += c.paid;
    }
  }
  return { schoolOwes, parentOwes, realBalance: schoolOwes - parentOwes };
}

/**
 * Bitta oy uchun barcha o'quvchilar katakchalaridan agregat (oylik taqsimot).
 * Faqat muddati kelgan oy hisobga olinadi (kelajak oy → 0 lar).
 */
export function aggregateMonth(key: MonthKey, cells: DebtCell[]): MonthlyAggregate {
  let expected = 0;
  let collected = 0;
  let discount = 0;
  let fullyPaid = 0;
  let partiallyPaid = 0;
  let unpaid = 0;
  for (const c of cells) {
    expected += c.expected;
    collected += c.paid;
    discount += c.discount;
    if (c.expected <= 0) continue; // shu oyda kutilgan to'lov yo'q → sanamaymiz
    if (c.status === 'paid') fullyPaid += 1;
    else if (c.status === 'partial') partiallyPaid += 1;
    else unpaid += 1;
  }
  const remaining = Math.max(expected - collected, 0);
  const collectionRate = expected > 0 ? (collected / expected) * 100 : 0;
  return {
    ...key,
    expected,
    collected,
    remaining,
    discount,
    collectionRate,
    fullyPaid,
    partiallyPaid,
    unpaid,
  };
}

/** `MonthKey` → `"YYYY-MM"` kalit (mate kaliti uchun). */
export function monthKeyStr(k: MonthKey): string {
  return `${k.year}-${String(k.month).padStart(2, '0')}`;
}
