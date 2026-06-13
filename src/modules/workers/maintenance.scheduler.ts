import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OperationalQueueService } from './operational-queue.service';

@Injectable()
export class MaintenanceScheduler {
  constructor(private readonly operationalQueue: OperationalQueueService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'daily-maintenance',
    timeZone: 'Asia/Tashkent',
  })
  dailyMaintenance(): Promise<void> {
    return this.operationalQueue.enqueueDailyMaintenance();
  }
}
