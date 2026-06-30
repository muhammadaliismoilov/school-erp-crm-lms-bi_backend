import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateLeaveDto, LeaveQueryDto, ReviewLeaveDto, UpdateLeaveDto } from './dto/hr.dto';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffMember } from './entities/staff-member.entity';
import { LeaveStatus, LeaveType } from './enums/hr.enums';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface LeaveResponse {
  id: string;
  staffMemberId: string;
  staffName: string | null;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveListResult {
  items: LeaveResponse[];
  meta: PageMeta;
}

const REVIEW_STATUSES = [LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.CANCELLED];

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(StaffLeave) private readonly leaves: Repository<StaffLeave>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
  ) {}

  async findLeaves(query: LeaveQueryDto): Promise<LeaveListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.leaves
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.staffMember', 'staff')
      .where('l.deleted_at IS NULL');

    if (query.status) qb.andWhere('l.status = :status', { status: query.status });
    if (query.type) qb.andWhere('l.type = :type', { type: query.type });
    if (query.staffMemberId) qb.andWhere('l.staff_member_id = :sid', { sid: query.staffMemberId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('staff.first_name ILIKE :q', { q: `%${search}%` })
            .orWhere('staff.last_name ILIKE :q', { q: `%${search}%` })
            .orWhere("CONCAT(staff.last_name, ' ', staff.first_name) ILIKE :q", { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('l.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((l) => this.toResponse(l)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getLeave(id: string): Promise<LeaveResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createLeave(dto: CreateLeaveDto): Promise<LeaveResponse> {
    await this.assertStaff(dto.staffMemberId);
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas');
    }

    const days = dto.days > 0 ? dto.days : this.diffDays(dto.startDate, dto.endDate);
    const entity = await this.leaves.save(
      this.leaves.create({
        staffMemberId: dto.staffMemberId,
        type: dto.type,
        startDate: dto.startDate,
        endDate: dto.endDate,
        days,
        reason: this.nullableText(dto.reason),
        status: dto.status ?? LeaveStatus.REQUESTED,
      }),
    );
    return this.getLeave(entity.id);
  }

  async updateLeave(id: string, dto: UpdateLeaveDto): Promise<LeaveResponse> {
    const entity = await this.findEntity(id);
    if (dto.staffMemberId !== undefined) {
      await this.assertStaff(dto.staffMemberId);
      entity.staffMemberId = dto.staffMemberId;
    }
    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.startDate !== undefined) entity.startDate = dto.startDate;
    if (dto.endDate !== undefined) entity.endDate = dto.endDate;
    if (entity.endDate < entity.startDate) {
      throw new BadRequestException('Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas');
    }
    if (dto.days !== undefined) entity.days = dto.days;
    if (dto.reason !== undefined) entity.reason = this.nullableText(dto.reason);
    if (dto.status !== undefined) entity.status = dto.status;

    await this.leaves.save(entity);
    return this.getLeave(entity.id);
  }

  async reviewLeave(id: string, dto: ReviewLeaveDto): Promise<LeaveResponse> {
    if (!REVIEW_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Holat approved, rejected yoki cancelled bo‘lishi kerak');
    }
    const entity = await this.findEntity(id);
    entity.status = dto.status;
    await this.leaves.save(entity);
    return this.getLeave(entity.id);
  }

  async removeLeave(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.leaves.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<StaffLeave> {
    const entity = await this.leaves.findOne({ where: { id }, relations: { staffMember: true } });
    if (!entity) throw new NotFoundException('Ta‘til topilmadi');
    return entity;
  }

  private async assertStaff(staffMemberId: string): Promise<void> {
    const exists = await this.staff.findOne({ where: { id: staffMemberId } });
    if (!exists) throw new NotFoundException('Xodim topilmadi');
  }

  private diffDays(start: string, end: string): number {
    const s = new Date(`${start}T00:00:00Z`).getTime();
    const e = new Date(`${end}T00:00:00Z`).getTime();
    return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
  }

  private toResponse(l: StaffLeave): LeaveResponse {
    const staffName = l.staffMember
      ? `${l.staffMember.lastName ?? ''} ${l.staffMember.firstName ?? ''}`.trim() || null
      : null;
    return {
      id: l.id,
      staffMemberId: l.staffMemberId,
      staffName,
      type: l.type,
      startDate: l.startDate,
      endDate: l.endDate,
      days: l.days,
      reason: l.reason ?? null,
      status: l.status,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
