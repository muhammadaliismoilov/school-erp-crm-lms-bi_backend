import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { NotificationCategory, NotificationStatus } from '../../common/enums/notification-enums';
import { AttendanceSettings } from '../attendance/entities/attendance-settings.entity';
import { Student } from '../students/entities/student.entity';
import { StudentParent } from '../students/entities/student-parent.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationOutbox } from './entities/notification-outbox.entity';
import { NotificationQueueService } from './notification-queue.service';

export interface AttendanceNotifyInput {
  studentId: string;
  category: NotificationCategory;
  date: string;
  /** Hodisa devor-soati (masalan '08:35') — matn va tinch soatlar uchun. */
  time?: string;
  minutesLate?: number;
  sessionId?: string;
  /** Takror-himoya uchun qo'shimcha qism (masalan sessionId). */
  dedupExtra?: string;
}

/**
 * Davomat hodisasidan ota-onaga xabar hosil qiladi: oluvchilarni (ota-ona)
 * aniqlaydi, sozlamalar (yoqilgan hodisalar, tinch soatlar) va kanalni
 * hisobga oladi, outbox yozuvlarini (dedup) yaratib navbatga qo'yadi.
 * Yuborishning o'zi worker'da asinxron bajariladi.
 */
@Injectable()
export class AttendanceNotifier {
  private readonly logger = new Logger(AttendanceNotifier.name);

  constructor(
    @InjectRepository(StudentParent)
    private readonly parents: Repository<StudentParent>,
    @InjectRepository(NotificationChannel)
    private readonly channels: Repository<NotificationChannel>,
    @InjectRepository(NotificationOutbox)
    private readonly outbox: Repository<NotificationOutbox>,
    @InjectRepository(AttendanceSettings)
    private readonly settingsRepo: Repository<AttendanceSettings>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    private readonly queue: NotificationQueueService,
    private readonly tenant: TenantContextService,
  ) {}

  async notify(input: AttendanceNotifyInput): Promise<void> {
    try {
      await this.notifyInternal(input);
    } catch (err) {
      // Notifikatsiya asosiy oqimni (davomat yozuvini) buzmasligi kerak.
      this.logger.error(`Notifikatsiya xatosi (${input.category}, ${input.studentId}): ${(err as Error).message}`);
    }
  }

  private async notifyInternal(input: AttendanceNotifyInput): Promise<void> {
    const settings = await this.settingsRepo.findOne({
      where: tenantWhere<AttendanceSettings>(this.tenant, {}, { branch: true }),
    });
    if (!this.categoryEnabled(input.category, settings)) return;

    const student = await this.students.findOne({
      where: tenantWhere<Student>(this.tenant, { id: input.studentId }, { branch: true }),
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) return;
    const studentName = `${student.lastName} ${student.firstName}`.trim();

    const links = await this.parents.find({
      where: tenantWhere<StudentParent>(this.tenant, { studentId: input.studentId }, { branch: true }),
      select: { parentId: true },
    });
    if (links.length === 0) return;

    const delayMs = this.quietDelayMs(input.time, settings);

    for (const link of links) {
      const channel = await this.pickChannel(link.parentId);
      if (!channel) continue;

      const dedupKey = `${input.category}:${link.parentId}:${input.studentId}:${input.date}:${input.dedupExtra ?? ''}`;
      const body = this.render(input, studentName, channel.language);

      const created = await this.createOutboxOnce({
        recipientUserId: link.parentId,
        channel: channel.type,
        address: channel.address,
        category: input.category,
        body,
        payload: {
          studentId: input.studentId,
          sessionId: input.sessionId ?? null,
          time: input.time ?? null,
          minutesLate: input.minutesLate ?? null,
        },
        dedupKey,
        scheduledAt: delayMs > 0 ? new Date(Date.now() + delayMs) : null,
        schoolId: channel.schoolId ?? null,
        filialId: channel.filialId ?? null,
      });

      if (created) await this.queue.enqueueDelivery(created, delayMs);
    }
  }

  /** Afzal (yoki birinchi faol) kanalni tanlaydi. */
  private async pickChannel(userId: string): Promise<NotificationChannel | null> {
    const list = await this.channels.find({
      where: tenantWhere<NotificationChannel>(this.tenant, { userId, active: true }, { branch: true }),
      order: { isPreferred: 'DESC', createdAt: 'ASC' },
    });
    return list[0] ?? null;
  }

  /** Idempotent outbox insert: yangi yozilsa IDsi, dublikat bo'lsa null. */
  private async createOutboxOnce(row: Partial<NotificationOutbox>): Promise<string | null> {
    const result = await this.outbox
      .createQueryBuilder()
      .insert()
      .values(row as never)
      .orIgnore()
      .execute();
    const id = result.identifiers[0]?.id as string | undefined;
    return id ?? null;
  }

  private categoryEnabled(category: NotificationCategory, settings: AttendanceSettings | null): boolean {
    if (!settings) return true; // sozlama yo'q — default yoqilgan.
    switch (category) {
      case NotificationCategory.SCHOOL_ENTRY:
        return settings.notifyOnEntry;
      case NotificationCategory.SCHOOL_EXIT:
        return settings.notifyOnExit;
      default:
        return settings.notifyOnSession;
    }
  }

  /** Xabar matni (hozircha uz; til bo'yicha kengaytiriladi). */
  private render(input: AttendanceNotifyInput, studentName: string, _language: string): string {
    const t = input.time ? ` ${input.time} da` : '';
    switch (input.category) {
      case NotificationCategory.SCHOOL_ENTRY:
        return `Farzandingiz <b>${studentName}</b>${t} maktabga kirdi.`;
      case NotificationCategory.SCHOOL_EXIT:
        return `Farzandingiz <b>${studentName}</b>${t} maktabdan chiqdi.`;
      case NotificationCategory.SESSION_PRESENT:
        return `Farzandingiz <b>${studentName}</b> darsda hozir bo‘ldi.`;
      case NotificationCategory.SESSION_LATE:
        return `Farzandingiz <b>${studentName}</b> darsga ${input.minutesLate ?? 0} daqiqa kechikib keldi.`;
      case NotificationCategory.SESSION_ABSENT:
        return `Farzandingiz <b>${studentName}</b> darsda yo‘q edi.`;
      case NotificationCategory.SESSION_LEFT_EARLY:
        return `Farzandingiz <b>${studentName}</b> darsdan erta ketdi.`;
      default:
        return `Davomat yangilanishi: ${studentName}.`;
    }
  }

  /** Tinch soatlar ichida bo'lsa, oyna oxirigacha kechiktirish (ms). */
  private quietDelayMs(time: string | undefined, settings: AttendanceSettings | null): number {
    if (!time || !settings?.quietHoursStart || !settings?.quietHoursEnd) return 0;
    const now = this.toMinutes(time);
    const start = this.toMinutes(settings.quietHoursStart);
    const end = this.toMinutes(settings.quietHoursEnd);
    const inWindow = start <= end ? now >= start && now < end : now >= start || now < end;
    if (!inWindow) return 0;
    const untilEnd = (end - now + 1440) % 1440;
    return untilEnd * 60_000;
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':');
    return Number.parseInt(h, 10) * 60 + Number.parseInt(m, 10);
  }
}
