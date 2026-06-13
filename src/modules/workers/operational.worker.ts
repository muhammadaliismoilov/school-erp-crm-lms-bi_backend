import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OPERATIONAL_QUEUE, OperationalJobData, OperationalJobName } from './worker-queues';

@Processor(OPERATIONAL_QUEUE)
export class OperationalWorker extends WorkerHost {
  private readonly logger = new Logger(OperationalWorker.name);

  async process(job: Job<OperationalJobData, void, OperationalJobName>): Promise<void> {
    switch (job.name) {
      case 'daily-maintenance':
        this.logger.log(`Daily maintenance requested by ${job.data.requestedBy}`);
        return;
      case 'storage-backup-check':
        this.logger.log(`Storage backup check requested by ${job.data.requestedBy}`);
        return;
      default:
        this.logger.warn(`Unknown operational job '${job.name}'`);
    }
  }
}
