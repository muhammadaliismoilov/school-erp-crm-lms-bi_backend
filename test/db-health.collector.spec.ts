import { DbHealthCollector } from '../src/common/database/db-health/db-health.collector';

const T0 = 1_800_000_000_000; // barqaror boshlang'ich vaqt

describe('DbHealthCollector', () => {
  let collector: DbHealthCollector;

  beforeEach(() => {
    collector = new DbHealthCollector();
  });

  it('hodisasiz — nol', () => {
    expect(collector.ratesPerMinute(T0)).toEqual({ slowPerMinute: 0, errorsPerMinute: 0 });
  });

  it('bir daqiqadagi hodisalarni to‘g‘ri sanaydi', () => {
    for (let i = 0; i < 12; i += 1) {
      collector.recordSlowQuery(T0 + i * 5_000); // 60 s ichida 12 ta
    }
    expect(collector.ratesPerMinute(T0 + 60_000).slowPerMinute).toBe(12);
  });

  it('oynadan chiqqan hodisalar unutiladi', () => {
    // Sirpanuvchi oynaning butun mohiyati: bir soat oldingi qiyinchilik
    // chiroqni hozir qizil ushlab turmasligi kerak.
    collector.recordSlowQuery(T0);
    collector.recordQueryError(T0);
    expect(collector.ratesPerMinute(T0 + 5_000).slowPerMinute).toBeGreaterThan(0);

    expect(collector.ratesPerMinute(T0 + 120_000)).toEqual({
      slowPerMinute: 0,
      errorsPerMinute: 0,
    });
  });

  it('qisqa portlashni haddan tashqari kuchaytirmaydi', () => {
    // Jonli sinovda topilgan: 10 s dagi 5 ta hodisani to'g'ridan-to'g'ri
    // daqiqaga cho'zsak "30/daq" chiqadi va chiroq DARHOL qizaradi. Bir
    // necha soniyalik portlash surunkali yuklama emas — eng kam 30 s
    // oynaga bo'linadi.
    for (let i = 0; i < 5; i += 1) {
      collector.recordSlowQuery(T0 + i * 2_000);
    }
    expect(collector.ratesPerMinute(T0 + 10_000).slowPerMinute).toBe(10);
  });

  it('to‘liq oynada haqiqiy tezlikni beradi', () => {
    // 60 s da 30 ta — bu chindan ham 30/daq, kuchaytirish yo'q.
    for (let i = 0; i < 30; i += 1) {
      collector.recordSlowQuery(T0 + i * 2_000);
    }
    expect(collector.ratesPerMinute(T0 + 60_000).slowPerMinute).toBe(30);
  });

  it('sekin so‘rov va xatolarni aralashtirmaydi', () => {
    collector.recordSlowQuery(T0);
    collector.recordQueryError(T0);
    collector.recordQueryError(T0 + 1_000);

    const rates = collector.ratesPerMinute(T0 + 60_000);
    expect(rates.slowPerMinute).toBe(1);
    expect(rates.errorsPerMinute).toBe(2);
  });

  it('xotira cheksiz o‘smaydi', () => {
    // Uzoq ishlaydigan jarayonda bucketlar to‘planib qolmasligi kerak.
    for (let i = 0; i < 5_000; i += 1) {
      collector.recordSlowQuery(T0 + i * 1_000);
    }
    const buckets = (collector as unknown as { buckets: unknown[] }).buckets;
    expect(buckets.length).toBeLessThanOrEqual(7);
  });
});
