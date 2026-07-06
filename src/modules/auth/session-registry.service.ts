import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { UserSession } from '../identity/entities/user-session.entity';

interface AliveCacheEntry {
  at: number;
  alive: boolean;
}

/** Jonlik keshi TTL — revoke qilingan qurilma maksimum shu vaqt ichida uziladi. */
const ALIVE_TTL_MS = 30_000;
/** lastSeen yozuvini kamida shu oraliqda bir marta yangilaymiz (DB'ni bosmaslik uchun). */
const TOUCH_THROTTLE_MS = 60_000;
/** Kesh cheksiz o'smasin (restartgacha yashaydigan oddiy himoya). */
const CACHE_MAX = 10_000;

/**
 * Sessiya jonligi reyestri — har so'rovda JWT'dagi sessionId tekshiriladi:
 * sessiya bekor qilingan (chiqarib tashlangan) bo'lsa, access token muddati
 * tugashini kutmasdan so'rov rad etiladi. 30s kesh bilan — 1000+
 * foydalanuvchida ham DB yuki sezilmaydi.
 */
@Injectable()
export class SessionRegistryService {
  private readonly aliveCache = new Map<string, AliveCacheEntry>();
  private readonly lastTouch = new Map<string, number>();

  constructor(
    @InjectRepository(UserSession)
    private readonly sessions: Repository<UserSession>,
  ) {}

  /** Sessiya tirikmi (mavjud, bekor qilinmagan, muddati o'tmagan)? */
  async isAlive(sessionId: string): Promise<boolean> {
    const cached = this.aliveCache.get(sessionId);
    if (cached && Date.now() - cached.at < ALIVE_TTL_MS) return cached.alive;

    const session = await this.sessions.findOne({
      where: { id: sessionId },
      select: { id: true, revokedAt: true, expiresAt: true },
    });
    const alive = !!session && !session.revokedAt && session.expiresAt.getTime() > Date.now();

    if (this.aliveCache.size >= CACHE_MAX) this.aliveCache.clear();
    this.aliveCache.set(sessionId, { at: Date.now(), alive });
    return alive;
  }

  /** lastSeen'ni throttle bilan yangilash (fire-and-forget — so'rovni sekinlashtirmaydi). */
  touch(sessionId: string): void {
    const last = this.lastTouch.get(sessionId) ?? 0;
    if (Date.now() - last < TOUCH_THROTTLE_MS) return;
    if (this.lastTouch.size >= CACHE_MAX) this.lastTouch.clear();
    this.lastTouch.set(sessionId, Date.now());
    void this.sessions
      .update({ id: sessionId }, { lastSeenAt: new Date() })
      .catch(() => undefined);
  }

  /** Bitta sessiyani bekor qilish — kesh darhol yangilanadi (30s kutilmaydi). */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.sessions.update(
      { id: sessionId, userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    this.aliveCache.set(sessionId, { at: Date.now(), alive: false });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Foydalanuvchining barcha sessiyalarini bekor qilish (ixtiyoriy — joriysidan
   * tashqari). Parol o'zgarganda va "boshqa hammasini chiqarish"da ishlatiladi.
   */
  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    const where = exceptSessionId
      ? { userId, revokedAt: IsNull(), id: Not(exceptSessionId) }
      : { userId, revokedAt: IsNull() };
    const victims = await this.sessions.find({ where, select: { id: true } });
    if (victims.length === 0) return 0;
    await this.sessions.update(
      victims.map((v) => v.id),
      { revokedAt: new Date() },
    );
    for (const v of victims) this.aliveCache.set(v.id, { at: Date.now(), alive: false });
    return victims.length;
  }
}
