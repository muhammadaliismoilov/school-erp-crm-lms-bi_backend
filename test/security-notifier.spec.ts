import type { Repository } from 'typeorm';
import { SecurityNotifierService } from '../src/modules/notifications-delivery/security-notifier.service';
import type { NotificationOutbox } from '../src/modules/notifications-delivery/entities/notification-outbox.entity';
import type { NotificationChannel } from '../src/modules/notifications-delivery/entities/notification-channel.entity';
import type { UserSession } from '../src/modules/identity/entities/user-session.entity';
import type { NotificationQueueService } from '../src/modules/notifications-delivery/notification-queue.service';
import { NotificationCategory, NotificationChannelType } from '../src/common/enums/notification-enums';

/** Fire-and-forget promise'lar tugashini kutish. */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('SecurityNotifierService', () => {
  let outbox: { createQueryBuilder: jest.Mock };
  let channels: { find: jest.Mock };
  let sessions: { count: jest.Mock };
  let queue: { enqueueDelivery: jest.Mock };
  let service: SecurityNotifierService;
  let insertedRows: Record<string, unknown>[];

  const telegramChannel = {
    type: NotificationChannelType.TELEGRAM,
    address: '123456789',
    userId: 'u-1',
    active: true,
    isPreferred: true,
    schoolId: null,
    filialId: null,
  };

  beforeEach(() => {
    insertedRows = [];
    const insertQb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockImplementation(function (this: unknown, v: Record<string, unknown>) {
        insertedRows.push(v);
        return insertQb;
      }),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 'out-1' }] }),
    };
    outbox = { createQueryBuilder: jest.fn().mockReturnValue(insertQb) };
    channels = { find: jest.fn().mockResolvedValue([telegramChannel]) };
    sessions = { count: jest.fn().mockResolvedValue(0) };
    queue = { enqueueDelivery: jest.fn().mockResolvedValue(undefined) };
    service = new SecurityNotifierService(
      outbox as unknown as Repository<NotificationOutbox>,
      channels as unknown as Repository<NotificationChannel>,
      sessions as unknown as Repository<UserSession>,
      queue as unknown as NotificationQueueService,
    );
  });

  it('yangi qurilma (avval ko‘rilmagan) — outbox yoziladi va navbatga qo‘yiladi', async () => {
    service.maybeNotifyNewLogin({ userId: 'u-1', sessionId: 's-1', deviceInfo: 'Chrome 126 · Linux', ipAddress: '1.2.3.4' });
    await flush();
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      recipientUserId: 'u-1',
      category: NotificationCategory.SECURITY_LOGIN,
      dedupKey: 'security_login:s-1',
      address: '123456789',
    });
    expect(String(insertedRows[0].body)).toContain('Chrome 126 · Linux');
    expect(queue.enqueueDelivery).toHaveBeenCalledWith('out-1');
  });

  it('tanish qurilma (avval shu nom bilan kirilgan) — jim qoladi', async () => {
    sessions.count.mockResolvedValue(3);
    service.maybeNotifyNewLogin({ userId: 'u-1', sessionId: 's-2', deviceInfo: 'Chrome 126 · Linux', ipAddress: '1.2.3.4' });
    await flush();
    expect(insertedRows).toHaveLength(0);
    expect(queue.enqueueDelivery).not.toHaveBeenCalled();
  });

  it('kanal ulanmagan foydalanuvchi — xatosiz jim qoladi', async () => {
    channels.find.mockResolvedValue([]);
    service.maybeNotifyNewLogin({ userId: 'u-2', sessionId: 's-3', deviceInfo: null, ipAddress: null });
    await flush();
    expect(insertedRows).toHaveLength(0);
  });

  it('notifyPasswordChanged — SECURITY_PASSWORD kategoriyasi bilan yoziladi', async () => {
    service.notifyPasswordChanged('u-1', 2);
    await flush();
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({ category: NotificationCategory.SECURITY_PASSWORD });
    expect(String(insertedRows[0].body)).toContain('2 ta boshqa qurilma');
  });
});
