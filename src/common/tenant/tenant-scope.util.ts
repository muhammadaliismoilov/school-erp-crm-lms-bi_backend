import type { FindOptionsWhere, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import type { TenantContextService } from './tenant-context.service';

/**
 * QueryBuilder'ga aktiv maktab (va ixtiyoriy filial) filtrini qo'shadi.
 * Faqat kontekstda qiymat bo'lsa qo'llanadi (kontekst yo'q — masalan worker —
 * bo'lsa filtrsiz qoladi). 2-bosqichda `school_id`/`filial_id` ustuni bor
 * entity'lar service'larida ishlatiladi.
 *
 * @example applyTenantScope(qb, 's', this.tenant, { branch: true })
 */
export function applyTenantScope<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  tenant: TenantContextService | undefined,
  opts: { branch?: boolean } = {},
): SelectQueryBuilder<T> {
  if (!tenant) return qb; // kontekst yo'q (masalan test/worker) — filtrsiz.
  const schoolId = tenant.getSchoolId();
  if (schoolId) {
    qb.andWhere(`${alias}.school_id = :tenantSchoolId`, { tenantSchoolId: schoolId });
  }
  if (opts.branch) {
    const branchId = tenant.getBranchId();
    if (branchId) {
      qb.andWhere(`${alias}.filial_id = :tenantBranchId`, { tenantBranchId: branchId });
    }
  }
  return qb;
}

/**
 * `findOne`/`count` uchun `where` obyektiga aktiv maktab (va ixtiyoriy filial)
 * shartini qo'shadi. Kontekstda qiymat bo'lmasa — o'sha shart tushib qoladi.
 *
 * @example this.repo.findOne({ where: tenantWhere(this.tenant, { id }, { branch: true }) })
 */
export function tenantWhere<T extends ObjectLiteral>(
  tenant: TenantContextService | undefined,
  base: FindOptionsWhere<T> = {} as FindOptionsWhere<T>,
  opts: { branch?: boolean } = {},
): FindOptionsWhere<T> {
  const where = { ...base } as Record<string, unknown>;
  if (!tenant) return where as FindOptionsWhere<T>; // kontekst yo'q — filtrsiz.
  const schoolId = tenant.getSchoolId();
  if (schoolId) where.schoolId = schoolId;
  if (opts.branch) {
    const branchId = tenant.getBranchId();
    if (branchId) where.filialId = branchId;
  }
  return where as FindOptionsWhere<T>;
}
