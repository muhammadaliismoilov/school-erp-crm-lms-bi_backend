import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { NotificationStatus } from '../../common/enums/notification-enums';
import { NotificationOutbox } from './entities/notification-outbox.entity';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NOTIFICATION_QUEUE, NotificationJobData, NotificationJobName } from './notification-queue';

/**
 * Outbox yozuvini yuboradi: holatni tekshiradi (takror emas), kanal orqali
 * jo'natadi, natijaga qarab SENT/FAILED/SKIPPED qo'yadi. Vaqtincha xatoda
 * (permanent emas) BullMQ retry qiladi (exponential backoff).
 */
@Processor(NOTIFICATION_QUEUE)
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    @InjectRepository(NotificationOutbox)
    private readonly outbox: Repository<NotificationOutbox>,
    private readonly dispatch: NotificationDispatchService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData, void, NotificationJobName>): Promise<void> {
    const row = await this.outbox.findOne({ where: { id: job.data.outboxId } });
    if (!row) {
      this.logger.warn(`Outbox topilmadi: ${job.data.outboxId}`);
      return;
    }
    if (row.status === NotificationStatus.SENT || row.status === NotificationStatus.SKIPPED) {
      return; // allaqachon yakunlangan.
    }

    row.attempts += 1;
    const result = await this.dispatch.dispatch(row.channel, row.address, row.body);

    if (result.ok) {
      row.status = NotificationStatus.SENT;
      row.sentAt = new Date();
      row.lastError = null;
      await this.outbox.save(row);
      return;
    }

    row.lastError = result.error ?? 'unknown';
    if (result.permanent) {
      row.status = NotificationStatus.SKIPPED;
      await this.outbox.save(row);
      return; // qayta urinishga arzimaydi.
    }

    // Vaqtincha xato — holatni saqlab, jobni qayta uloqtiramiz (BullMQ backoff).
    row.status = NotificationStatus.PENDING;
    await this.outbox.save(row);
    throw new Error(row.lastError);
  }
}
