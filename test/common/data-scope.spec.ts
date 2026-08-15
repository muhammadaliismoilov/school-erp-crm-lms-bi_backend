import { DataScope, widestDataScope, EMPTY_OWN_SCOPE } from '../../src/common/scope/data-scope.enum';
import { applyOwnershipScope } from '../../src/common/scope/data-scope.util';

/** `andWhere` chaqiruvlarini yozib boruvchi soxta QueryBuilder. */
function fakeQb() {
  const calls: Array<{ sql: string; params?: Record<string, unknown> }> = [];
  const qb = {
    calls,
    andWhere(sql: string, params?: Record<string, unknown>) {
      calls.push({ sql, params });
      return qb;
    },
  };
  return qb;
}

describe('widestDataScope', () => {
  it("bitta ham keng rol bo'lsa — to'liq ko'rish (rollar qo'shiluvchi)", () => {
    expect(widestDataScope([DataScope.OWN, DataScope.ALL])).toBe(DataScope.ALL);
  });

  it("barcha rollar tor bo'lsa — tor", () => {
    expect(widestDataScope([DataScope.OWN, DataScope.OWN])).toBe(DataScope.OWN);
  });

  it('rolsiz foydalanuvchi yopiq qoladi', () => {
    expect(widestDataScope([])).toBe(DataScope.OWN);
  });
});

describe('applyOwnershipScope', () => {
  it("bitta yo'l uchun IN sharti qo'yadi", () => {
    const qb = fakeQb();
    applyOwnershipScope(qb as never, 'student', [
      { column: 'current_class_id', values: ['c1', 'c2'] },
      { column: 'id', values: [] },
    ]);

    expect(qb.calls).toHaveLength(1);
    expect(qb.calls[0].sql).toMatch(/^\(student\.current_class_id IN \(:\.\.\.ownScope\d+\)\)$/);
    expect(Object.values(qb.calls[0].params ?? {})).toEqual([['c1', 'c2']]);
  });

  it("bir necha yo'lni OR bilan birlashtiradi", () => {
    const qb = fakeQb();
    applyOwnershipScope(qb as never, 'student', [
      { column: 'current_class_id', values: ['c1'] },
      { column: 'id', values: ['s1'] },
    ]);

    expect(qb.calls).toHaveLength(1);
    expect(qb.calls[0].sql).toContain(' OR ');
    expect(qb.calls[0].sql).toContain('student.current_class_id IN');
    expect(qb.calls[0].sql).toContain('student.id IN');
  });

  it("hech qanday egalik yo'q — HECH NARSA qaytmaydi (filtr tashlanmaydi)", () => {
    const qb = fakeQb();
    applyOwnershipScope(qb as never, 'student', [
      { column: 'current_class_id', values: EMPTY_OWN_SCOPE.classIds },
      { column: 'id', values: EMPTY_OWN_SCOPE.studentIds },
    ]);

    expect(qb.calls).toEqual([{ sql: '1 = 0', params: undefined }]);
  });

  it("bitta so'rovda ikki marta chaqirilsa parametr nomlari to'qnashmaydi", () => {
    const qb = fakeQb();
    applyOwnershipScope(qb as never, 'student', [{ column: 'id', values: ['a'] }]);
    applyOwnershipScope(qb as never, 'other', [{ column: 'id', values: ['b'] }]);

    const [first] = Object.keys(qb.calls[0].params ?? {});
    const [second] = Object.keys(qb.calls[1].params ?? {});
    expect(first).not.toBe(second);
  });
});
