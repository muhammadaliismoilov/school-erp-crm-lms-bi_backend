import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Bitta "egalik yo'li": ustun + shu ustun mos kelishi kerak bo'lgan qiymatlar. */
export interface OwnershipPath {
  /** DB ustuni (snake_case), masalan `current_class_id`. */
  column: string;
  values: readonly string[];
}

let paramSeq = 0;

/**
 * `applyTenantScope` ning egalik uchun analogi: QueryBuilder'ga "bu qator
 * menikimi" shartini qo'shadi. Yo'llar OR bilan birlashtiriladi — o'quvchi
 * MENING SINFIMDA bo'lsa YOKI MENING farzandim bo'lsa ko'rinadi.
 *
 * Muhim xavfsizlik qoidasi: birorta ham yo'lda qiymat bo'lmasa, so'rov
 * `1 = 0` ga aylanadi — ya'ni HECH NARSA qaytmaydi. Filtrni butunlay tashlab
 * yuborish (va hammani ko'rsatish) eng xavfli xatolik bo'lardi.
 *
 * @example applyOwnershipScope(qb, 'student', [
 *   { column: 'current_class_id', values: own.classIds },
 *   { column: 'id', values: own.studentIds },
 * ])
 */
export function applyOwnershipScope<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  paths: readonly OwnershipPath[],
): SelectQueryBuilder<T> {
  const usable = paths.filter((path) => path.values.length > 0);
  if (usable.length === 0) {
    return qb.andWhere('1 = 0');
  }

  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  for (const path of usable) {
    // Har chaqiruvda unikal parametr nomi — bitta so'rovda bir necha marta
    // chaqirilsa nomlar to'qnashmasin (TypeORM parametrlarni ustidan yozadi).
    const key = `ownScope${(paramSeq += 1)}`;
    clauses.push(`${alias}.${path.column} IN (:...${key})`);
    params[key] = path.values;
  }

  return qb.andWhere(`(${clauses.join(' OR ')})`, params);
}
