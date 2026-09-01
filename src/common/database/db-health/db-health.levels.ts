/**
 * Baza sog'lig'i darajasining SOF mantig'i — DI'siz, vaqt va holatga
 * bog'lanmagan, shuning uchun to'g'ridan-to'g'ri test qilinadi.
 */

/** Chiroq ko'rsatadigan uch holat. */
export type DbHealthLevel = 'ok' | 'busy' | 'critical';

/** Darajani ko'targan aniq signal — panel shuni matn qilib ko'rsatadi. */
export type DbHealthSignal = 'pool_waiting' | 'slow_queries' | 'query_errors';

export interface DbHealthInputs {
  /** Ulanish kutayotgan so'rovlar (pool navbati), oniy qiymat. */
  waiting: number;
  /** Oxirgi oynadagi sekin so'rovlar soni, daqiqaga keltirilgan. */
  slowPerMinute: number;
  /** Oxirgi oynadagi DB xatolari, daqiqaga keltirilgan. */
  errorsPerMinute: number;
}

export interface DbHealthThresholds {
  waitingBusy: number;
  waitingCritical: number;
  slowBusy: number;
  slowCritical: number;
}

/**
 * Standart chegaralar — VAQTINCHALIK.
 *
 * Bular haqiqiy o'lchovdan emas, oqilona taxmindan olingan: joriy bazada
 * yuklama deyarli yo'q (`users` 1 195, `students` 801), ya'ni tayanadigan
 * taqsimot hali yig'ilmagan. `DbHealthService` daraja o'zgarishlarini
 * jurnalga yozadi; bir-ikki haftadan keyin shu jurnal asosida `.env` orqali
 * to'g'rilanadi.
 *
 * Noto'g'ri chegara chiroqni "doim sariq" qiladi va odamlar unga qarashni
 * to'xtatadi — monitoring o'limining eng keng tarqalgan sababi.
 */
export const DEFAULT_DB_HEALTH_THRESHOLDS: DbHealthThresholds = {
  waitingBusy: 1,
  waitingCritical: 4,
  slowBusy: 3,
  slowCritical: 15,
};

const RANK: Record<DbHealthLevel, number> = { ok: 0, busy: 1, critical: 2 };

/** Ikki darajadan yomonrog'i. */
export function worst(a: DbHealthLevel, b: DbHealthLevel): DbHealthLevel {
  return RANK[a] >= RANK[b] ? a : b;
}

export interface DbHealthVerdict {
  level: DbHealthLevel;
  /** Darajani `ok` dan yuqoriga ko'targan signallar. */
  signals: DbHealthSignal[];
}

/**
 * Uchta signaldan eng yomonini tanlaydi.
 *
 * Har biri boshqa turdagi nosozlikni ko'radi va yolg'iz o'zi to'liq rasm
 * bermaydi:
 *  - `waiting` — so'rovlar ulanish kutyapti, ya'ni bir vaqtda kelayotgan
 *    yuk pool sig'imidan oshgan;
 *  - `slowPerMinute` — so'rovlarning O'ZI uzoq (indeks yo'q, jadval o'sgan).
 *    Bitta og'ir so'rov poolni band qilmasligi mumkin, lekin sahifa qotadi;
 *  - `errorsPerMinute` — bazaga umuman yetib bo'lmayapti yoki timeout.
 *    Bu alomat emas, nosozlik — shuning uchun HAR QANDAY xato darhol qizil.
 */
export function evaluateDbHealth(
  inputs: DbHealthInputs,
  thresholds: DbHealthThresholds = DEFAULT_DB_HEALTH_THRESHOLDS,
): DbHealthVerdict {
  const signals: DbHealthSignal[] = [];
  let level: DbHealthLevel = 'ok';

  const raise = (next: DbHealthLevel, signal: DbHealthSignal): void => {
    if (next === 'ok') return;
    level = worst(level, next);
    signals.push(signal);
  };

  raise(
    inputs.waiting >= thresholds.waitingCritical
      ? 'critical'
      : inputs.waiting >= thresholds.waitingBusy
        ? 'busy'
        : 'ok',
    'pool_waiting',
  );

  raise(
    inputs.slowPerMinute >= thresholds.slowCritical
      ? 'critical'
      : inputs.slowPerMinute >= thresholds.slowBusy
        ? 'busy'
        : 'ok',
    'slow_queries',
  );

  raise(inputs.errorsPerMinute > 0 ? 'critical' : 'ok', 'query_errors');

  return { level, signals };
}
