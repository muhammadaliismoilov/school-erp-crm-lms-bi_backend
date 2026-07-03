export const NOTIFICATION_QUEUE = 'notification-delivery';

export type NotificationJobName = 'deliver';

export interface NotificationJobData {
  /** Yuboriladigan outbox yozuvining IDsi. */
  outboxId: string;
}
