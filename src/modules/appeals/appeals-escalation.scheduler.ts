import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppealsService } from './appeals.service';

/**
 * Muddati o'tgan murojaatlar uchun kunlik eslatma.
 *
 * NEGA `WorkersModule` DA EMAS: u yerdagi navbat (`OperationalWorker`) hozircha
 * faqat log yozadigan skelet, va unga `AppealsService`ni ulash `WorkersModule`ni
 * appeals moduliga bog'lab qo'yardi. Ish qisqa va kuniga bir marta bajariladi —
 * navbat qatlamini oraga qo'yish qiymat qo'shmaydi.
 *
 * NEGA ERTALAB, kechasi emas: bu — odamga boradigan push. `daily-maintenance`
 * 03:00 da ishlaydi, chunki u texnik ish; muddat eslatmasi esa ish kuni
 * boshlanishida, o'qiladigan vaqtda kelishi kerak.
 */
@Injectable()
export class AppealsEscalationScheduler {
  private readonly logger = new Logger(AppealsEscalationScheduler.name);

  constructor(private readonly appeals: AppealsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'appeals-overdue-escalation',
    timeZone: 'Asia/Tashkent',
  })
  async remindOverdue(): Promise<void> {
    try {
      await this.appeals.escalateOverdue();
    } catch (error) {
      // Cron ichidan chiqqan xato ilovani qulatmasin: ertaga qayta uriniladi.
      this.logger.error(
        `Muddat eskalatsiyasi bajarilmadi: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
