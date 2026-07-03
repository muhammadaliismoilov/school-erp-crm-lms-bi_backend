import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryDeepPartialEntity, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { PersonType } from '../../common/enums/person-type.enum';
import { AttendanceLog } from './entities/attendance-log.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { StaffAttendanceRecord } from './entities/staff-attendance-record.entity';
import { TurnstileAssignment } from './entities/turnstile-assignment.entity';
import { TurnstileDevice } from './entities/turnstile-device.entity';
import { TurnstileEventDto } from './dto/ingest-turnstile-events.dto';

/** Qabul qilingan (yangi) hodisa — keyingi bosqichda notifikatsiya uchun. */
export interface AcceptedTurnstileEvent {
  personType: PersonType;
  personId: string;
  direction: 'in' | 'out';
  date: string;
  time: string;
  capturedAt: Date;
}

export interface IngestionResult {
  accepted: number;
  duplicates: number;
  unresolved: number;
  events: AcceptedTurnstileEvent[];
}

/**
 * Turniket hodisalarini ishonchli qabul qiladi:
 *  - shaxsni kod orqali aniqlaydi (TurnstileAssignment);
 *  - idempotent yozadi (takror hodisa e'tiborsiz qoldiriladi);
 *  - kunlik davomat proyeksiyasini (birinchi kirish / oxirgi chiqish) yangilaydi.
 * Tenant (maktab/filial) aynan qurilmadan olinadi, chunki so'rovda JWT yo'q.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(AttendanceLog)
    private readonly logs: Repository<AttendanceLog>,
    @InjectRepository(AttendanceRecord)
    private readonly studentRecords: Repository<AttendanceRecord>,
    @InjectRepository(StaffAttendanceRecord)
    private readonly staffRecords: Repository<StaffAttendanceRecord>,
    @InjectRepository(TurnstileAssignment)
    private readonly assignments: Repository<TurnstileAssignment>,
    @InjectRepository(TurnstileDevice)
    private readonly devices: Repository<TurnstileDevice>,
    private readonly tenant: TenantContextService,
  ) {}

  async ingest(device: TurnstileDevice, events: TurnstileEventDto[]): Promise<IngestionResult> {
    // Yozuvlar to'g'ri maktab/filialga tegishli bo'lishi uchun kontekstni
    // qurilmadan to'ldiramiz (TenantWriteSubscriber shundan foydalanadi).
    this.tenant.set({ schoolId: device.schoolId ?? null, branchId: device.filialId ?? null });

    const result: IngestionResult = { accepted: 0, duplicates: 0, unresolved: 0, events: [] };

    for (const event of events) {
      const person = await this.resolvePerson(event.code);
      if (!person) {
        result.unresolved += 1;
        this.logger.warn(`Aniqlanmagan kod: ${event.code} (device ${device.deviceNumber})`);
        continue;
      }

      const capturedAt = new Date(event.capturedAt);
      const { date, time } = this.splitWallClock(event.capturedAt);
      const idempotencyKey =
        event.eventId ?? `${device.deviceNumber}:${event.code}:${event.direction}:${event.capturedAt}`;

      const inserted = await this.insertLogOnce({
        schoolId: device.schoolId ?? null,
        filialId: device.filialId ?? null,
        personType: person.personType,
        personId: person.personId,
        timestamp: capturedAt,
        receivedAt: new Date(),
        direction: event.direction,
        deviceNumber: device.deviceNumber,
        idempotencyKey,
        faceMatchConfidence: event.faceMatchConfidence ?? null,
        rawPayload: event.raw ?? null,
      });

      if (!inserted) {
        result.duplicates += 1;
        continue;
      }

      await this.updateDailyProjection(person.personType, person.personId, event.direction, date, time);
      result.accepted += 1;
      result.events.push({
        personType: person.personType,
        personId: person.personId,
        direction: event.direction,
        date,
        time,
        capturedAt,
      });
    }

    await this.devices.update({ id: device.id }, { lastSeenAt: new Date() });
    return result;
  }

  /** Kod bo'yicha shaxsni (o'quvchi/xodim) aniqlaydi. */
  private async resolvePerson(
    code: string,
  ): Promise<{ personType: PersonType; personId: string } | null> {
    const base = tenantWhere<TurnstileAssignment>(this.tenant, { active: true }, { branch: true });
    const assignment = await this.assignments.findOne({
      where: [
        { ...base, entryCode: code },
        { ...base, exitCode: code },
      ],
    });
    if (!assignment) return null;
    return { personType: assignment.personType, personId: assignment.personId };
  }

  /** Idempotent insert: takror bo'lsa `false`, yangi yozilsa `true`. */
  private async insertLogOnce(row: Partial<AttendanceLog>): Promise<boolean> {
    const result = await this.logs
      .createQueryBuilder()
      .insert()
      // jsonb (raw_payload) TypeORM deep-partial tipi bilan to'qnashadi — cast lokal.
      .values(row as unknown as QueryDeepPartialEntity<AttendanceLog>)
      .orIgnore() // ON CONFLICT DO NOTHING (idempotency_key unique)
      .execute();
    return result.identifiers.some((id) => id != null);
  }

  /** Kunlik davomat yozuvini (birinchi kirish / oxirgi chiqish) yangilaydi. */
  private async updateDailyProjection(
    personType: PersonType,
    personId: string,
    direction: 'in' | 'out',
    date: string,
    time: string,
  ): Promise<void> {
    if (personType === PersonType.STUDENT) {
      const where = tenantWhere<AttendanceRecord>(this.tenant, { studentId: personId, date }, { branch: true });
      const record = (await this.studentRecords.findOne({ where })) ?? this.studentRecords.create({ studentId: personId, date });
      this.applyDirection(record, direction, time);
      await this.studentRecords.save(record);
    } else {
      const where = tenantWhere<StaffAttendanceRecord>(this.tenant, { userId: personId, date }, { branch: true });
      const record = (await this.staffRecords.findOne({ where })) ?? this.staffRecords.create({ userId: personId, date });
      this.applyDirection(record, direction, time);
      await this.staffRecords.save(record);
    }
  }

  /** Kirish/chiqish vaqtini yozuvga qo'llaydi (eng erta kirish, eng kech chiqish). */
  private applyDirection(
    record: AttendanceRecord | StaffAttendanceRecord,
    direction: 'in' | 'out',
    time: string,
  ): void {
    if (record.status == null || record.status === AttendanceStatus.ABSENT) {
      // Fizik borlik faktdan aniqlandi — kamida "keldi".
      record.status = AttendanceStatus.PRESENT;
    }
    if (direction === 'in') {
      if (!record.checkInTime || time < record.checkInTime) record.checkInTime = time;
    } else {
      if (!record.checkOutTime || time > record.checkOutTime) record.checkOutTime = time;
    }
  }

  /**
   * ISO-8601 satridan devor-soati (wall-clock) sana va vaqtni ajratadi.
   * Vaqt mintaqasini o'zgartirmaymiz — qurilma bergan mahalliy vaqtni saqlaymiz,
   * shunda "08:35 da kirdi" aynan shunday ko'rinadi.
   */
  private splitWallClock(iso: string): { date: string; time: string } {
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/.exec(iso);
    if (match) {
      return { date: match[1], time: `${match[2]}:${match[3] ?? '00'}` };
    }
    // Zaxira: Date orqali (UTC).
    const d = new Date(iso);
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 19) };
  }
}
