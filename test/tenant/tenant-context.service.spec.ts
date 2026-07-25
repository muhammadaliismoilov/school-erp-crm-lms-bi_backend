import { TenantContextService } from '../../src/common/tenant/tenant-context.service';

describe('TenantContextService', () => {
  let tenant: TenantContextService;

  beforeEach(() => {
    tenant = new TenantContextService();
  });

  it('kontekstsiz null qaytaradi', () => {
    expect(tenant.getSchoolId()).toBeNull();
    expect(tenant.getBranchId()).toBeNull();
    expect(tenant.hasContext()).toBe(false);
  });

  it('run ichida set qilingan qiymatni o‘qiydi', () => {
    tenant.run(() => {
      tenant.set({ schoolId: 'school-1', branchId: 'branch-1' });
      expect(tenant.getSchoolId()).toBe('school-1');
      expect(tenant.getBranchId()).toBe('branch-1');
      expect(tenant.hasContext()).toBe(true);
    });
  });

  it('parallel so‘rovlar bir-biriga aralashmaydi (izolyatsiya)', async () => {
    const runReq = (school: string) =>
      new Promise<string | null>((resolve) => {
        void tenant.run(async () => {
          tenant.set({ schoolId: school });
          // Asinxron kutish — ALS kontekst async chegaradan o‘tishi shart.
          await new Promise((r) => setTimeout(r, 10));
          resolve(tenant.getSchoolId());
        });
      });

    const [a, b] = await Promise.all([runReq('school-A'), runReq('school-B')]);
    expect(a).toBe('school-A');
    expect(b).toBe('school-B');
  });

  it('kontekstdan tashqarida set hech narsa qilmaydi', () => {
    tenant.set({ schoolId: 'x' });
    expect(tenant.getSchoolId()).toBeNull();
  });
});
