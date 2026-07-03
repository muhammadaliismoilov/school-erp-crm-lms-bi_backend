import { DataSource, InsertEvent } from 'typeorm';
import { TenantWriteSubscriber } from '../../src/common/tenant/tenant-write.subscriber';
import { TenantContextService } from '../../src/common/tenant/tenant-context.service';

/** InsertEvent'ning kerakli qismini yasovchi yordamchi. */
function makeEvent(entity: Record<string, unknown>, props: string[]): InsertEvent<Record<string, unknown>> {
  return {
    entity,
    metadata: { columns: props.map((propertyName) => ({ propertyName })) },
  } as unknown as InsertEvent<Record<string, unknown>>;
}

describe('TenantWriteSubscriber', () => {
  const tenant = new TenantContextService();
  const dataSource = { subscribers: [] } as unknown as DataSource;
  const subscriber = new TenantWriteSubscriber(dataSource, tenant);

  it('o‘zini dataSource.subscribers ga qo‘shadi', () => {
    expect(dataSource.subscribers).toContain(subscriber);
  });

  it('school_id/filial_id ustuni bo‘lsa va bo‘sh bo‘lsa — kontekstdan to‘ldiradi', () => {
    tenant.run(() => {
      tenant.set({ schoolId: 'school-A', branchId: 'branch-1' });
      const entity: Record<string, unknown> = {};
      subscriber.beforeInsert(makeEvent(entity, ['schoolId', 'filialId', 'name']));
      expect(entity.schoolId).toBe('school-A');
      expect(entity.filialId).toBe('branch-1');
    });
  });

  it('aniq berilgan qiymatni ustidan yozmaydi', () => {
    tenant.run(() => {
      tenant.set({ schoolId: 'school-A', branchId: 'branch-1' });
      const entity: Record<string, unknown> = { schoolId: 'school-B' };
      subscriber.beforeInsert(makeEvent(entity, ['schoolId']));
      expect(entity.schoolId).toBe('school-B');
    });
  });

  it('school_id ustuni yo‘q entity‘ga tegmaydi (global entity)', () => {
    tenant.run(() => {
      tenant.set({ schoolId: 'school-A' });
      const entity: Record<string, unknown> = {};
      subscriber.beforeInsert(makeEvent(entity, ['name', 'code']));
      expect(entity.schoolId).toBeUndefined();
    });
  });

  it('kontekst yo‘q bo‘lsa hech narsa qo‘ymaydi', () => {
    const entity: Record<string, unknown> = {};
    subscriber.beforeInsert(makeEvent(entity, ['schoolId', 'filialId']));
    expect(entity.schoolId).toBeUndefined();
    expect(entity.filialId).toBeUndefined();
  });
});
