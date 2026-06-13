import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MaintenanceScheduler } from './maintenance.scheduler';
import { OperationalQueueService } from './operational-queue.service';
import { OperationalWorker } from './operational.worker';
import { OPERATIONAL_QUEUE } from './worker-queues';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OPERATIONAL_QUEUE,
    }),
  ],
  providers: [OperationalQueueService, OperationalWorker, MaintenanceScheduler],
  exports: [OperationalQueueService],
})
export class WorkersModule {}
