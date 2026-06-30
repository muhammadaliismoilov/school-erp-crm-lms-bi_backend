import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateWorkScheduleDto,
  UpdateWorkScheduleDto,
  WorkScheduleDayDto,
  WorkScheduleQueryDto,
} from './dto/work-schedule.dto';
import { WorkSchedule } from './entities/work-schedule.entity';
import { Weekday, WorkScheduleDay } from './entities/work-schedule-day.entity';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface WorkScheduleDayResponse {
  weekday: Weekday;
  startTime: string | null;
  endTime: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
}

export interface WorkScheduleResponse {
  id: string;
  name: string;
  description: string | null;
  isStandard: boolean;
  days: WorkScheduleDayResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkScheduleListResult {
  items: WorkScheduleResponse[];
  meta: PageMeta;
}

const WEEKDAY_ORDER: Record<Weekday, number> = {
  [Weekday.MONDAY]: 1,
  [Weekday.TUESDAY]: 2,
  [Weekday.WEDNESDAY]: 3,
  [Weekday.THURSDAY]: 4,
  [Weekday.FRIDAY]: 5,
  [Weekday.SATURDAY]: 6,
  [Weekday.SUNDAY]: 7,
};

@Injectable()
export class WorkScheduleService {
  constructor(
    @InjectRepository(WorkSchedule) private readonly schedules: Repository<WorkSchedule>,
    @InjectRepository(WorkScheduleDay) private readonly days: Repository<WorkScheduleDay>,
  ) {}

  async findSchedules(query: WorkScheduleQueryDto): Promise<WorkScheduleListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.schedules.createQueryBuilder('s').where('s.deleted_at IS NULL');
    const search = this.nullableText(query.search);
    if (search) qb.andWhere('s.name ILIKE :q', { q: `%${search}%` });

    const [items, total] = await qb
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const withDays = await Promise.all(items.map((s) => this.loadResponse(s.id)));

    return {
      items: withDays,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getSchedule(id: string): Promise<WorkScheduleResponse> {
    return this.loadResponse(id);
  }

  async createSchedule(dto: CreateWorkScheduleDto): Promise<WorkScheduleResponse> {
    const schedule = await this.schedules.save(
      this.schedules.create({
        name: dto.name.trim(),
        description: this.nullableText(dto.description),
        isStandard: dto.isStandard ?? false,
        days: (dto.days ?? []).map((d) => this.makeDay(d)),
      }),
    );
    return this.loadResponse(schedule.id);
  }

  async updateSchedule(id: string, dto: UpdateWorkScheduleDto): Promise<WorkScheduleResponse> {
    const schedule = await this.findEntity(id);
    if (dto.name !== undefined) schedule.name = dto.name.trim();
    if (dto.description !== undefined) schedule.description = this.nullableText(dto.description);
    if (dto.isStandard !== undefined) schedule.isStandard = dto.isStandard;
    await this.schedules.save(schedule);

    if (dto.days !== undefined) {
      await this.days.delete({ scheduleId: id });
      if (dto.days.length > 0) {
        await this.days.save(dto.days.map((d) => this.days.create({ ...this.makeDay(d), scheduleId: id })));
      }
    }
    return this.loadResponse(id);
  }

  async removeSchedule(id: string): Promise<void> {
    const schedule = await this.findEntity(id);
    await this.schedules.softDelete(schedule.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private makeDay(d: WorkScheduleDayDto): Partial<WorkScheduleDay> {
    return {
      weekday: d.weekday,
      startTime: d.startTime ?? null,
      endTime: d.endTime ?? null,
      lunchStart: d.lunchStart ?? null,
      lunchEnd: d.lunchEnd ?? null,
    };
  }

  private async findEntity(id: string): Promise<WorkSchedule> {
    const entity = await this.schedules.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Jadval topilmadi');
    return entity;
  }

  private async loadResponse(id: string): Promise<WorkScheduleResponse> {
    const entity = await this.schedules.findOne({ where: { id }, relations: { days: true } });
    if (!entity) throw new NotFoundException('Jadval topilmadi');
    const days = [...(entity.days ?? [])]
      .sort((a, b) => WEEKDAY_ORDER[a.weekday] - WEEKDAY_ORDER[b.weekday])
      .map((d) => ({
        weekday: d.weekday,
        startTime: this.fmtTime(d.startTime),
        endTime: this.fmtTime(d.endTime),
        lunchStart: this.fmtTime(d.lunchStart),
        lunchEnd: this.fmtTime(d.lunchEnd),
      }));
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      isStandard: entity.isStandard,
      days,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /** Postgres `time` `HH:mm:ss` qaytaradi — UI uchun `HH:mm` ga qisqartiramiz. */
  private fmtTime(value?: string | null): string | null {
    if (!value) return null;
    return value.slice(0, 5);
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
