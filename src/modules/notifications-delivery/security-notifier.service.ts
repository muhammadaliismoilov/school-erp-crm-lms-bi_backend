import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { NotificationCategory } from '../../common/enums/notification-enums';
import { UserSession } from '../identity/entities/user-session.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationOutbox } from './entities/notification-outbox.entity';
import { NotificationQueueService } from './notification-queue.service';

/**
 * Xavfsizlik ogohlantirishlari: yangi qurilmadan kirish va parol almashinuvi.
 * Mavjud outbox+worker infratuzilmasi ustida — xabar yo'qolmaydi, dedup bor.
 * Hech qachon exception otmaydi (login oqimini buzmaslik uchun) — xato faqat logga.
 */
@Injectable()
export class SecurityNotifierService {
  private readonly logger = new Logger(SecurityNotifierService.name);

  constructor(
    @InjectRepository(NotificationOutbox)
    private readonly outbox: Repository<NotificationOutbox>,
    @InjectRepository(NotificationChannel)
    private readonly channels: Repository<NotificationChannel>,
    @InjectRepository(UserSession)
    private readonly sessions: Repository<UserSession>,
    private readonly queue: NotificationQueueService,
  ) {}

  /**
   * Login'dan keyin chaqiriladi: qurilma foydalanuvchi uchun YANGI bo'lsa
   * (avval shu nomdagi qurilmadan kirmagan) — ogohlantirish yuboriladi.
   * Fire-and-forget: await qilinmaydi, xato yutiladi.
   */
  maybeNotifyNewLogin(input: {
    userId: string;
    sessionId: string;
    deviceInfo: string | null;
    ipAddress: string | null;
  }): void {
    void this.doNotifyNewLogin(input).catch((e) =>
      this.logger.warn(`Yangi-kirish xabari yuborilmadi: ${(e as Error).message}`),
    );
  }

  private async doNotifyNewLogin(input: {
    userId: string;
    sessionId: string;
    deviceInfo: string | null;
    ipAddress: string | null;
  }): Promise<void> {
    // "Yangi qurilma"mi? — shu nomdagi qurilmadan avval kirilgan bo'lsa, jim qolamiz
    // (aks holda har login shovqin bo'lardi). deviceInfo null bo'lsa har doim xabar.
    if (input.deviceInfo) {
      const seenBefore = await this.sessions.count({
        where: { userId: input.userId, deviceInfo: input.deviceInfo, id: Not(input.sessionId) },
      });
      if (seenBefore > 0) return;
    }

    const channel = await this.pickChannel(input.userId);
    if (!channel) return; // kanal ulanmagan — yuboradigan joy yo'q.

    const when = new Date().toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
    const body =
      `🔐 Yangi qurilmadan kirish\n` +
      `Qurilma: ${input.deviceInfo ?? "noma'lum"}\n` +
      `IP: ${input.ipAddress ?? '—'}\n` +
      `Vaqt: ${when}\n\n` +
      `Bu siz bo'lmasangiz: Profil → Qurilmalar bo'limidan uni chiqaring va parolni almashtiring.`;

    const created = await this.createOnce({
      recipientUserId: input.userId,
      channel: channel.type,
      address: channel.address,
      category: NotificationCategory.SECURITY_LOGIN,
      body,
      payload: { sessionId: input.sessionId, ip: input.ipAddress },
      dedupKey: `security_login:${input.sessionId}`,
      schoolId: channel.schoolId ?? null,
      filialId: channel.filialId ?? null,
    });
    if (created) await this.queue.enqueueDelivery(created);
  }

  /** Parol almashtirilganda — darhol xabar (dedupsiz, har almashinuv muhim). */
  notifyPasswordChanged(userId: string, revokedSessions: number): void {
    void (async () => {
      const channel = await this.pickChannel(userId);
      if (!channel) return;
      const body =
        `🔑 Parolingiz almashtirildi.\n` +
        `${revokedSessions} ta boshqa qurilma hisobdan chiqarildi.\n\n` +
        `Bu siz bo'lmasangiz — darhol administratorga murojaat qiling.`;
      const created = await this.createOnce({
        recipientUserId: userId,
        channel: channel.type,
        address: channel.address,
        category: NotificationCategory.SECURITY_PASSWORD,
        body,
        payload: { revokedSessions },
        dedupKey: null,
        schoolId: channel.schoolId ?? null,
        filialId: channel.filialId ?? null,
      });
      if (created) await this.queue.enqueueDelivery(created);
    })().catch((e) => this.logger.warn(`Parol xabari yuborilmadi: ${(e as Error).message}`));
  }

  /** Afzal (yoki birinchi faol) kanal. Tenant filtrisiz — login paytida kontekst bo'lmaydi. */
  private async pickChannel(userId: string): Promise<NotificationChannel | null> {
    const list = await this.channels.find({
      where: { userId, active: true },
      order: { isPreferred: 'DESC', createdAt: 'ASC' },
    });
    return list[0] ?? null;
  }

  /** Idempotent outbox insert (dedupKey unique bo'lsa dublikat yozilmaydi). */
  private async createOnce(row: Partial<NotificationOutbox>): Promise<string | null> {
    const result = await this.outbox
      .createQueryBuilder()
      .insert()
      .values(row as never)
      .orIgnore()
      .execute();
    return (result.identifiers[0]?.id as string | undefined) ?? null;
  }
}
