import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  CreatePerformanceReviewDto,
  PerformanceReviewQueryDto,
  UpdatePerformanceReviewDto,
} from './dto/performance-review.dto';
import { PerformanceReview } from './entities/performance-review.entity';
import { StaffMember } from './entities/staff-member.entity';
import { PerformanceReviewStatus } from './enums/hr.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface PerformanceReviewResponse {
  id: string;
  staffMemberId: string;
  staffName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  periodStart: string;
  periodEnd: string;
  overallRating: number | null;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  notes: string | null;
  status: PerformanceReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceReviewListResult {
  items: PerformanceReviewResponse[];
  meta: PageMeta;
}

@Injectable()
export class PerformanceReviewService {
  constructor(
    @InjectRepository(PerformanceReview) private readonly reviews: Repository<PerformanceReview>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    private readonly tenant: TenantContextService,
  ) {}

  async findReviews(query: PerformanceReviewQueryDto): Promise<PerformanceReviewListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.reviews
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.staffMember', 'staff')
      .leftJoinAndSelect('r.reviewer', 'reviewer')
      .where('r.deleted_at IS NULL');
    applyTenantScope(qb, 'r', this.tenant, { branch: true });

    if (query.staffMemberId) qb.andWhere('r.staff_member_id = :sid', { sid: query.staffMemberId });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('staff.first_name ILIKE :q', { q: `%${search}%` }).orWhere('staff.last_name ILIKE :q', {
            q: `%${search}%`,
          });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('r.periodEnd', 'DESC')
      .addOrderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((r) => this.toResponse(r)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getReview(id: string): Promise<PerformanceReviewResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createReview(dto: CreatePerformanceReviewDto): Promise<PerformanceReviewResponse> {
    await this.assertStaff(dto.staffMemberId);
    if (dto.reviewerId) await this.assertStaff(dto.reviewerId);
    this.assertPeriod(dto.periodStart, dto.periodEnd);

    const entity = await this.reviews.save(
      this.reviews.create({
        staffMemberId: dto.staffMemberId,
        reviewerId: dto.reviewerId ?? null,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        overallRating: dto.overallRating ?? null,
        strengths: this.nullableText(dto.strengths),
        improvements: this.nullableText(dto.improvements),
        goals: this.nullableText(dto.goals),
        notes: this.nullableText(dto.notes),
        status: dto.status ?? PerformanceReviewStatus.COMPLETED,
      }),
    );
    return this.getReview(entity.id);
  }

  async updateReview(id: string, dto: UpdatePerformanceReviewDto): Promise<PerformanceReviewResponse> {
    const entity = await this.findEntity(id);
    if (dto.staffMemberId !== undefined) {
      await this.assertStaff(dto.staffMemberId);
      entity.staffMemberId = dto.staffMemberId;
    }
    if (dto.reviewerId !== undefined) {
      if (dto.reviewerId) await this.assertStaff(dto.reviewerId);
      entity.reviewerId = dto.reviewerId || null;
    }
    if (dto.periodStart !== undefined) entity.periodStart = dto.periodStart;
    if (dto.periodEnd !== undefined) entity.periodEnd = dto.periodEnd;
    this.assertPeriod(entity.periodStart, entity.periodEnd);
    if (dto.overallRating !== undefined) entity.overallRating = dto.overallRating ?? null;
    if (dto.strengths !== undefined) entity.strengths = this.nullableText(dto.strengths);
    if (dto.improvements !== undefined) entity.improvements = this.nullableText(dto.improvements);
    if (dto.goals !== undefined) entity.goals = this.nullableText(dto.goals);
    if (dto.notes !== undefined) entity.notes = this.nullableText(dto.notes);
    if (dto.status !== undefined) entity.status = dto.status;

    await this.reviews.save(entity);
    return this.getReview(entity.id);
  }

  async removeReview(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.reviews.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<PerformanceReview> {
    const entity = await this.reviews.findOne({
      where: tenantWhere<PerformanceReview>(this.tenant, { id }, { branch: true }),
      relations: { staffMember: true, reviewer: true },
    });
    if (!entity) throw new NotFoundException('Baholash topilmadi');
    return entity;
  }

  private async assertStaff(staffMemberId: string): Promise<void> {
    const exists = await this.staff.findOne({ where: tenantWhere<StaffMember>(this.tenant, { id: staffMemberId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Xodim topilmadi');
  }

  private assertPeriod(start: string, end: string): void {
    if (end < start) {
      throw new BadRequestException('Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas');
    }
  }

  private staffName(s?: StaffMember | null): string | null {
    if (!s) return null;
    return `${s.lastName ?? ''} ${s.firstName ?? ''}`.trim() || null;
  }

  private toResponse(r: PerformanceReview): PerformanceReviewResponse {
    return {
      id: r.id,
      staffMemberId: r.staffMemberId,
      staffName: this.staffName(r.staffMember),
      reviewerId: r.reviewerId ?? null,
      reviewerName: this.staffName(r.reviewer),
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      overallRating: r.overallRating != null ? Number(r.overallRating) : null,
      strengths: r.strengths ?? null,
      improvements: r.improvements ?? null,
      goals: r.goals ?? null,
      notes: r.notes ?? null,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
