import {
  DEFAULT_DB_HEALTH_THRESHOLDS,
  evaluateDbHealth,
  worst,
  type DbHealthInputs,
} from '../src/common/database/db-health/db-health.levels';

const calm: DbHealthInputs = { waiting: 0, slowPerMinute: 0, errorsPerMinute: 0 };
const T = DEFAULT_DB_HEALTH_THRESHOLDS;

describe('evaluateDbHealth', () => {
  it('yuklama yo‘q — yashil', () => {
    expect(evaluateDbHealth(calm)).toEqual({ level: 'ok', signals: [] });
  });

  // ---- Pool navbati ----

  it('pool navbati chegaraga yetganda sariq', () => {
    const verdict = evaluateDbHealth({ ...calm, waiting: T.waitingBusy });
    expect(verdict.level).toBe('busy');
    expect(verdict.signals).toEqual(['pool_waiting']);
  });

  it('chegaradan bir pastda hali yashil', () => {
    // Chegara qaysi tomonga tegishli ekani ataylab qulflanadi.
    expect(evaluateDbHealth({ ...calm, waiting: T.waitingBusy - 1 }).level).toBe('ok');
  });

  it('navbat kritik chegaraga yetganda qizil', () => {
    expect(evaluateDbHealth({ ...calm, waiting: T.waitingCritical }).level).toBe('critical');
  });

  // ---- Sekin so'rovlar ----

  it('sekin so‘rovlar pool bo‘sh bo‘lsa ham darajani ko‘taradi', () => {
    // Bitta og'ir so'rov poolni band qilmaydi, lekin sahifa qotadi —
    // faqat `waiting` ga qarasak bu holat KO'RINMAY qolardi.
    const verdict = evaluateDbHealth({ ...calm, slowPerMinute: T.slowCritical });
    expect(verdict.level).toBe('critical');
    expect(verdict.signals).toEqual(['slow_queries']);
  });

  // ---- Xatolar ----

  it('bitta DB xatosi ham darhol qizil', () => {
    // Bu alomat emas, nosozlik: bazaga yetib bo‘lmayapti yoki timeout.
    const verdict = evaluateDbHealth({ ...calm, errorsPerMinute: 1 });
    expect(verdict.level).toBe('critical');
    expect(verdict.signals).toEqual(['query_errors']);
  });

  // ---- Eng yomoni g'olib ----

  it('eng yomon signal darajani belgilaydi', () => {
    const verdict = evaluateDbHealth({
      waiting: T.waitingBusy,
      slowPerMinute: T.slowCritical,
      errorsPerMinute: 0,
    });
    expect(verdict.level).toBe('critical');
  });

  it('darajani ko‘targan HAR signal qayd etiladi', () => {
    // Panel "nima uchun qizil" degan savolga javob berishi kerak; bitta
    // sabab ko'rsatish chalg'itardi.
    const verdict = evaluateDbHealth({
      waiting: T.waitingCritical,
      slowPerMinute: T.slowBusy,
      errorsPerMinute: 2,
    });
    expect(verdict.signals.sort()).toEqual(['pool_waiting', 'query_errors', 'slow_queries']);
  });

  it('chegaralar tashqaridan berilishi mumkin', () => {
    // `.env` orqali kalibrlash uchun — deploy'siz to‘g‘rilanadi.
    const strict = { ...T, waitingBusy: 10, waitingCritical: 20 };
    expect(evaluateDbHealth({ ...calm, waiting: 5 }, strict).level).toBe('ok');
  });
});

describe('worst', () => {
  it('darajalarni to‘g‘ri tartibda taqqoslaydi', () => {
    expect(worst('ok', 'busy')).toBe('busy');
    expect(worst('critical', 'busy')).toBe('critical');
    expect(worst('ok', 'ok')).toBe('ok');
  });
});
