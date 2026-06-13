import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { OPERATIONAL_QUEUE, OperationalJobData, OperationalJobName } from './worker-queues';

@Injectable()
export class OperationalQueueService {
  constructor(
    @InjectQueue(OPERATIONAL_QUEUE)
    private readonly queue: Queue<OperationalJobData, void, OperationalJobName>,
  ) {}

  async enqueueDailyMaintenance(requestedBy = 'system'): Promise<void> {
    await this.queue.add(
      'daily-maintenance',
      {
        requestedAt: new Date().toISOString(),
        requestedBy,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 1_000,
      },
    );
  }

  async enqueueStorageBackupCheck(requestedBy = 'system'): Promise<void> {
    await this.queue.add(
      'storage-backup-check',
      {
        requestedAt: new Date().toISOString(),
        requestedBy,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 1_000,
      },
    );
  }
}
