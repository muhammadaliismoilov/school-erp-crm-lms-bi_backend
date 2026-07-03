import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannelType } from '../../common/enums/notification-enums';

export interface DispatchResult {
  ok: boolean;
  /** true => qayta urinish mantiqan foydasiz (masalan kanal sozlanmagan). */
  permanent?: boolean;
  error?: string;
}

/**
 * Xabarni tegishli kanal orqali yuboradi. Telegram — real HTTP (bot token
 * konfiguratsiyadan). Push — hozircha stub (FCM/APNs ulash uchun tayyor nuqta).
 */
@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(private readonly config: ConfigService) {}

  async dispatch(channel: NotificationChannelType, address: string, body: string): Promise<DispatchResult> {
    switch (channel) {
      case NotificationChannelType.TELEGRAM:
        return this.sendTelegram(address, body);
      case NotificationChannelType.PUSH:
        return this.sendPush(address, body);
      default:
        return { ok: false, permanent: true, error: `Noma'lum kanal: ${channel}` };
    }
  }

  private async sendTelegram(chatId: string, body: string): Promise<DispatchResult> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN sozlanmagan — Telegram xabari o‘tkazib yuborildi.');
      return { ok: false, permanent: true, error: 'telegram-not-configured' };
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: body, parse_mode: 'HTML' }),
      });
      if (res.ok) return { ok: true };
      const text = await res.text();
      // 4xx (bloklangan/noto'g'ri chat) — qayta urinish foydasiz; 429/5xx — vaqtincha.
      const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
      return { ok: false, permanent, error: `telegram ${res.status}: ${text.slice(0, 200)}` };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  private async sendPush(token: string, body: string): Promise<DispatchResult> {
    // TODO: FCM/APNs integratsiyasi. Hozircha log (ilova tokeni saqlanadi).
    this.logger.log(`[PUSH stub] ${token.slice(0, 12)}… → ${body}`);
    return { ok: true };
  }
}
