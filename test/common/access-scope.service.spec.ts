import { DataScope } from '../../src/common/scope/data-scope.enum';
import { AccessScopeService } from '../../src/common/scope/access-scope.service';
import { TenantContextService } from '../../src/common/tenant/tenant-context.service';

/** `getRawMany` qaytaradigan minimal QueryBuilder taqlidi. */
function rawQb(rows: unknown[]) {
  const qb: Record<string, unknown> = {};
  for (const method of ['select', 'where', 'andWhere']) {
    qb[method] = () => qb;
  }
  qb.getRawMany = jest.fn().mockResolvedValue(rows);
  return qb;
}

function repoWithRaw(rows: unknown[]) {
  return { createQueryBuilder: jest.fn(() => rawQb(rows)) } as never;
}

function buildService(options: {
  staffMember?: { id: string } | null;
  teacher?: { id: string } | null;
  leaderships?: Array<{ classId: string }>;
  slots?: Array<{ classId: string }>;
  studentLinks?: Array<{ studentId: string }>;
  tenant: TenantContextService;
}) {
  const staff = { findOne: jest.fn().mockResolvedValue(options.staffMember ?? null) } as never;
  const teachers = { findOne: jest.fn().mockResolvedValue(options.teacher ?? null) } as never;

  return new AccessScopeService(
    staff,
    teachers,
    repoWithRaw(options.leaderships ?? []),
    repoWithRaw(options.slots ?? []),
    repoWithRaw(options.studentLinks ?? []),
    options.tenant,
  );
}

/** Kontekst ochib, ichida testni bajaradi (ALS bo'lmasa doira `ALL`). */
function inRequest<T>(
  tenant: TenantContextService,
  init: Parameters<TenantContextService['set']>[0],
  body: () => Promise<T>,
): Promise<T> {
  return tenant.run(() => {
    tenant.set(init);
    return body();
  });
}

describe('AccessScopeService', () => {
  it("doira `ALL` bo'lsa egalik filtri qo'llanmaydi", async () => {
    const tenant = new TenantContextService();
    const service = buildService({ tenant });

    await inRequest(tenant, { userId: 'u1', dataScope: DataScope.ALL }, async () => {
      expect(service.isRestricted()).toBe(false);
    });
  });

  it("o'qituvchining sinflari = sinf rahbarligi ∪ dars jadvali (takrorsiz)", async () => {
    const tenant = new TenantContextService();
    const service = buildService({
      tenant,
      staffMember: { id: 'staff-1' },
      teacher: { id: 'teacher-1' },
      leaderships: [{ classId: 'c1' }],
      slots: [{ classId: 'c1' }, { classId: 'c2' }],
    });

    const own = await inRequest(tenant, { userId: 'u1', dataScope: DataScope.OWN }, () =>
      service.resolveOwnScope(),
    );

    expect(own.classIds.sort()).toEqual(['c1', 'c2']);
  });

  it('ota-ona o‘z farzandlarini oladi, sinf esa bo‘sh', async () => {
    const tenant = new TenantContextService();
    const service = buildService({
      tenant,
      staffMember: null, // xodim emas → o'qituvchi ham emas
      studentLinks: [{ studentId: 's1' }, { studentId: 's2' }],
    });

    const own = await inRequest(tenant, { userId: 'parent-1', dataScope: DataScope.OWN }, () =>
      service.resolveOwnScope(),
    );

    expect(own.classIds).toEqual([]);
    expect(own.studentIds).toEqual(['s1', 's2']);
  });

  it("xodim ham, ota-ona ham bo'lmagan foydalanuvchi hech nima ko'rmaydi", async () => {
    const tenant = new TenantContextService();
    const service = buildService({ tenant, staffMember: null, studentLinks: [] });

    const own = await inRequest(tenant, { userId: 'u1', dataScope: DataScope.OWN }, () =>
      service.resolveOwnScope(),
    );

    expect(own).toEqual({ classIds: [], studentIds: [] });
  });

  it("natija so'rov davomida keshlanadi — DB'ga ikkinchi marta bormaydi", async () => {
    const tenant = new TenantContextService();
    const staff = { findOne: jest.fn().mockResolvedValue({ id: 'staff-1' }) } as never;
    const teachers = { findOne: jest.fn().mockResolvedValue({ id: 'teacher-1' }) } as never;
    const service = new AccessScopeService(
      staff,
      teachers,
      repoWithRaw([{ classId: 'c1' }]),
      repoWithRaw([]),
      repoWithRaw([]),
      tenant,
    );

    await inRequest(tenant, { userId: 'u1', dataScope: DataScope.OWN }, async () => {
      const first = await service.resolveOwnScope();
      const second = await service.resolveOwnScope();
      expect(second).toBe(first);
      expect((staff as unknown as { findOne: jest.Mock }).findOne).toHaveBeenCalledTimes(1);
    });
  });

  it("foydalanuvchisiz kontekstda (worker/seed) bo'sh doira qaytadi", async () => {
    const tenant = new TenantContextService();
    const service = buildService({ tenant });

    const own = await inRequest(tenant, { dataScope: DataScope.OWN }, () =>
      service.resolveOwnScope(),
    );

    expect(own).toEqual({ classIds: [], studentIds: [] });
  });
});
