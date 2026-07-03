import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSurveyDto, SurveyQueryDto, UpdateSurveyDto } from './dto/survey.dto';
import { Survey } from './entities/survey.entity';
import { SurveyStatus, SurveyType } from './enums/hr.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface SurveyResponse {
  id: string;
  title: string;
  description: string | null;
  type: SurveyType;
  status: SurveyStatus;
  isAnonymous: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyListResult {
  items: SurveyResponse[];
  meta: PageMeta;
}

@Injectable()
export class SurveyService {
  constructor(@InjectRepository(Survey) private readonly surveys: Repository<Survey>, private readonly tenant: TenantContextService) {}

  async findSurveys(query: SurveyQueryDto): Promise<SurveyListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.surveys.createQueryBuilder('s').where('s.deleted_at IS NULL');
    applyTenantScope(qb, 's', this.tenant, { branch: true });
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    const search = this.nullableText(query.search);
    if (search) qb.andWhere('s.title ILIKE :q', { q: `%${search}%` });

    const [items, total] = await qb
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((s) => this.toResponse(s)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getSurvey(id: string): Promise<SurveyResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createSurvey(dto: CreateSurveyDto): Promise<SurveyResponse> {
    this.assertDateRange(dto.startDate, dto.endDate);
    const entity = await this.surveys.save(
      this.surveys.create({
        title: dto.title.trim(),
        description: this.nullableText(dto.description),
        type: dto.type ?? SurveyType.ANONYMOUS,
        isAnonymous: dto.isAnonymous ?? true,
        status: SurveyStatus.DRAFT,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
      }),
    );
    return this.getSurvey(entity.id);
  }

  async updateSurvey(id: string, dto: UpdateSurveyDto): Promise<SurveyResponse> {
    const entity = await this.findEntity(id);
    if (dto.title !== undefined) entity.title = dto.title.trim();
    if (dto.description !== undefined) entity.description = this.nullableText(dto.description);
    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.isAnonymous !== undefined) entity.isAnonymous = dto.isAnonymous;
    if (dto.startDate !== undefined) entity.startDate = dto.startDate ?? null;
    if (dto.endDate !== undefined) entity.endDate = dto.endDate ?? null;
    this.assertDateRange(entity.startDate, entity.endDate);
    await this.surveys.save(entity);
    return this.getSurvey(entity.id);
  }

  async publishSurvey(id: string): Promise<SurveyResponse> {
    const entity = await this.findEntity(id);
    entity.status = SurveyStatus.ACTIVE;
    await this.surveys.save(entity);
    return this.getSurvey(entity.id);
  }

  async closeSurvey(id: string): Promise<SurveyResponse> {
    const entity = await this.findEntity(id);
    entity.status = SurveyStatus.CLOSED;
    await this.surveys.save(entity);
    return this.getSurvey(entity.id);
  }

  async removeSurvey(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.surveys.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Survey> {
    const entity = await this.surveys.findOne({ where: tenantWhere<Survey>(this.tenant, { id }, { branch: true }) });
    if (!entity) throw new NotFoundException('So‘rovnoma topilmadi');
    return entity;
  }

  private assertDateRange(start?: string | null, end?: string | null): void {
    if (start && end && end < start) {
      throw new BadRequestException('Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas');
    }
  }

  private toResponse(s: Survey): SurveyResponse {
    return {
      id: s.id,
      title: s.title,
      description: s.description ?? null,
      type: s.type,
      status: s.status,
      isAnonymous: s.isAnonymous,
      startDate: s.startDate ?? null,
      endDate: s.endDate ?? null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
