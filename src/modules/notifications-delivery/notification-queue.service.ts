import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NOTIFICATION_QUEUE, NotificationJobData, NotificationJobName } from './notification-queue';

@Injectable()
export class NotificationQueueService {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly queue: Queue<NotificationJobData, void, NotificationJobName>,
  ) {}

  /**
   * Outbox yozuvini yuborishga navbatga qo'yadi. `delayMs` — tinch soatlar uchun
   * kechiktirish. `jobId` idempotent (bir outbox uchun bitta job).
   */
  async enqueueDelivery(outboxId: string, delayMs = 0): Promise<void> {
    await this.queue.add(
      'deliver',
      { outboxId },
      {
        jobId: `deliver:${outboxId}`,
        delay: delayMs > 0 ? delayMs : undefined,
        attempts: 5,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: true,
        removeOnFail: 5_000,
      },
    );
  }
}
