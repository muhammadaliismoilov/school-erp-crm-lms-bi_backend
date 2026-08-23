import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  CreateTimesheetDto,
  TimesheetLineDto,
  TimesheetQueryDto,
  UpdateTimesheetDto,
} from './dto/timesheet.dto';
import { Timesheet } from './entities/timesheet.entity';
import { TimesheetLine } from './entities/timesheet-line.entity';
import { TimesheetStatus } from './enums/hr.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface TimesheetLineResponse {
  id: string;
  staffMemberId: string;
  staffName: string | null;
  workedDays: number;
  workedHours: number;
  note: string | null;
}

export interface TimesheetResponse {
  id: string;
  year: number;
  month: number;
  departmentId: string | null;
  departmentName: string | null;
  status: TimesheetStatus;
  submittedAt: Date | null;
  approvedAt: Date | null;
  note: string | null;
  lines: TimesheetLineResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimesheetListResult {
  items: TimesheetResponse[];
  meta: PageMeta;
}

@Injectable()
export class TimesheetService {
  constructor(
    @InjectRepository(Timesheet) private readonly timesheets: Repository<Timesheet>,
    @InjectRepository(TimesheetLine) private readonly lines: Repository<TimesheetLine>,
    private readonly tenant: TenantContextService,
  ) {}

  async findTimesheets(query: TimesheetQueryDto): Promise<TimesheetListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.timesheets
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.department', 'department')
      .where('t.deleted_at IS NULL');
    applyTenantScope(qb, 't', this.tenant, { branch: true });

    if (query.year) qb.andWhere('t.year = :year', { year: query.year });
    if (query.month) qb.andWhere('t.month = :month', { month: query.month });
    if (query.departmentId) qb.andWhere('t.department_id = :did', { did: query.departmentId });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });

    const [items, total] = await qb
      .orderBy('t.year', 'DESC')
      .addOrderBy('t.month', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const withLines = await Promise.all(items.map((t) => this.loadResponse(t.id)));

    return {
      items: withLines,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getTimesheet(id: string): Promise<TimesheetResponse> {
    return this.loadResponse(id);
  }

  async createTimesheet(dto: CreateTimesheetDto): Promise<TimesheetResponse> {
    const existing = await this.timesheets.findOne({
      where: { year: dto.year, month: dto.month, departmentId: dto.departmentId ?? IsNull() },
    });
    if (existing) {
      throw new ConflictException('Bu bo‘lim uchun shu oy taqvimi allaqachon mavjud');
    }
    const entity = await this.timesheets.save(
      this.timesheets.create({
        year: dto.year,
        month: dto.month,
        departmentId: dto.departmentId ?? null,
        status: TimesheetStatus.DRAFT,
        note: this.nullableText(dto.note),
        lines: (dto.lines ?? []).map((l) => this.makeLine(l)),
      }),
    );
    return this.loadResponse(entity.id);
  }

  async updateTimesheet(id: string, dto: UpdateTimesheetDto): Promise<TimesheetResponse> {
    const entity = await this.findEntity(id);
    if (dto.year !== undefined) entity.year = dto.year;
    if (dto.month !== undefined) entity.month = dto.month;
    if (dto.departmentId !== undefined) entity.departmentId = dto.departmentId || null;
    if (dto.note !== undefined) entity.note = this.nullableText(dto.note);
    await this.timesheets.save(entity);

    if (dto.lines !== undefined) {
      await this.lines.delete({ timesheetId: id });
      if (dto.lines.length > 0) {
        await this.lines.save(dto.lines.map((l) => this.lines.create({ ...this.makeLine(l), timesheetId: id })));
      }
    }
    return this.loadResponse(id);
  }

  async submitTimesheet(id: string): Promise<TimesheetResponse> {
    const entity = await this.findEntity(id);
    entity.status = TimesheetStatus.SUBMITTED;
    entity.submittedAt = new Date();
    await this.timesheets.save(entity);
    return this.loadResponse(id);
  }

  async approveTimesheet(id: string): Promise<TimesheetResponse> {
    const entity = await this.findEntity(id);
    if (entity.status === TimesheetStatus.DRAFT) {
      throw new BadRequestException('Avval taqvimni yuborish (submit) kerak');
    }
    entity.status = TimesheetStatus.APPROVED;
    entity.approvedAt = new Date();
    await this.timesheets.save(entity);
    return this.loadResponse(id);
  }

  async removeTimesheet(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.timesheets.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private makeLine(l: TimesheetLineDto): Partial<TimesheetLine> {
    return {
      staffMemberId: l.staffMemberId,
      workedDays: l.workedDays ?? 0,
      workedHours: l.workedHours ?? 0,
      note: this.nullableText(l.note),
    };
  }

  private async findEntity(id: string): Promise<Timesheet> {
    const entity = await this.timesheets.findOne({ where: tenantWhere<Timesheet>(this.tenant, { id }, { branch: true }) });
    if (!entity) throw new NotFoundException('Taqvim topilmadi');
    return entity;
  }

  private async loadResponse(id: string): Promise<TimesheetResponse> {
    const entity = await this.timesheets.findOne({
      where: tenantWhere<Timesheet>(this.tenant, { id }, { branch: true }),
      relations: { department: true, lines: { staffMember: true } },
    });
    if (!entity) throw new NotFoundException('Taqvim topilmadi');
    return {
      id: entity.id,
      year: entity.year,
      month: entity.month,
      departmentId: entity.departmentId ?? null,
      departmentName: entity.department?.name ?? null,
      status: entity.status,
      submittedAt: entity.submittedAt ?? null,
      approvedAt: entity.approvedAt ?? null,
      note: entity.note ?? null,
      lines: (entity.lines ?? []).map((l) => ({
        id: l.id,
        staffMemberId: l.staffMemberId,
        staffName: l.staffMember
          ? `${l.staffMember.lastName ?? ''} ${l.staffMember.firstName ?? ''}`.trim() || null
          : null,
        workedDays: Number(l.workedDays) || 0,
        workedHours: Number(l.workedHours) || 0,
        note: l.note ?? null,
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
