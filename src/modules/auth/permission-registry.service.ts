import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../identity/entities/role.entity';

interface PermissionCacheEntry {
  at: number;
  codes: string[];
}

/**
 * Ruxsatlar keshi TTL — rol o'zgargach yangi ruxsatlar maksimum shu vaqt
 * ichida kuchga kiradi (ilgari JWT ichida bo'lgani uchun 15 daqiqa kutilardi).
 */
const PERMISSIONS_TTL_MS = 30_000;
/** Kesh cheksiz o'smasin (restartgacha yashaydigan oddiy himoya). */
const CACHE_MAX = 10_000;

/**
 * Foydalanuvchi ruxsatlari reyestri.
 *
 * Ruxsatlar ATAYLAB JWT ichida saqlanmaydi: `ceo`/`director` hisoblarida ular
 * 439 tagacha yetadi va token 15 KB dan oshib ketadi. Bunday `Authorization`
 * sarlavhasi brauzerning qolgan sarlavhalari bilan birga 16 KB limitidan
 * oshadi va Vercel ham, Render ham so'rovni HTTP 431 (Request Header Fields
 * Too Large) bilan rad etadi — ya'ni kirgandan keyin BIRORTA API so'rovi
 * ishlamaydi. Shuning uchun token faqat shaxsni tashiydi, ruxsatlar esa har
 * so'rovda shu yerdan (30s kesh bilan) o'qiladi.
 *
 * Yon foyda: rol o'zgarishi 15 daqiqa emas, 30 soniyada kuchga kiradi.
 */
@Injectable()
export class PermissionRegistryService {
  private readonly cache = new Map<string, PermissionCacheEntry>();

  constructor(
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
  ) {}

  /** Foydalanuvchining barcha rollaridan yig'ilgan noyob ruxsat kodlari. */
  async codesForUser(userId: string): Promise<string[]> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.at < PERMISSIONS_TTL_MS) return cached.codes;

    const rows = await this.roles
      .createQueryBuilder('role')
      .innerJoin('role.users', 'user')
      .innerJoin('role.permissions', 'permission')
      .where('user.id = :userId', { userId })
      .select('DISTINCT permission.code', 'code')
      .getRawMany<{ code: string }>();

    const codes = rows.map((row) => row.code);

    if (this.cache.size >= CACHE_MAX) this.cache.clear();
    this.cache.set(userId, { at: Date.now(), codes });
    return codes;
  }

  /** Keshni darhol bo'shatish — rol/ruxsat o'zgargach 30s kutmaslik uchun. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}
