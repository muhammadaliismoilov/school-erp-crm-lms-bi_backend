import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateInteractionDto,
  InteractionQueryDto,
  UpdateInteractionDto,
} from './dto/interaction.dto';
import { Interaction } from './entities/interaction.entity';
import { InteractionStatus, InteractionType } from './enums/hr.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface InteractionResponse {
  id: string;
  title: string;
  type: InteractionType;
  status: InteractionStatus;
  candidateId: string | null;
  candidateName: string | null;
  location: string | null;
  scheduledAt: Date | null;
  endAt: Date | null;
  purpose: string | null;
  description: string | null;
  result: string | null;
  summary: string | null;
  nextSteps: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionListResult {
  items: InteractionResponse[];
  meta: PageMeta;
}

@Injectable()
export class InteractionService {
  constructor(@InjectRepository(Interaction) private readonly interactions: Repository<Interaction>, private readonly tenant: TenantContextService) {}

  async findInteractions(query: InteractionQueryDto): Promise<InteractionListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.interactions
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.candidate', 'candidate')
      .where('i.deleted_at IS NULL');
    applyTenantScope(qb, 'i', this.tenant, { branch: true });

    if (query.type) qb.andWhere('i.type = :type', { type: query.type });
    if (query.status) qb.andWhere('i.status = :status', { status: query.status });
    if (query.candidateId) qb.andWhere('i.candidate_id = :cid', { cid: query.candidateId });

    const search = this.nullableText(query.search);
    if (search) qb.andWhere('i.title ILIKE :q', { q: `%${search}%` });

    const [items, total] = await qb
      .orderBy('i.scheduledAt', 'DESC', 'NULLS LAST')
      .addOrderBy('i.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((i) => this.toResponse(i)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getInteraction(id: string): Promise<InteractionResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createInteraction(dto: CreateInteractionDto): Promise<InteractionResponse> {
    const entity = await this.interactions.save(
      this.interactions.create({
        title: dto.title.trim(),
        type: dto.type ?? InteractionType.CALL,
        status: dto.status ?? InteractionStatus.PLANNED,
        candidateId: dto.candidateId ?? null,
        location: this.nullableText(dto.location),
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        purpose: this.nullableText(dto.purpose),
        description: this.nullableText(dto.description),
        result: this.nullableText(dto.result),
        summary: this.nullableText(dto.summary),
        nextSteps: this.nullableText(dto.nextSteps),
      }),
    );
    return this.getInteraction(entity.id);
  }

  async updateInteraction(id: string, dto: UpdateInteractionDto): Promise<InteractionResponse> {
    const entity = await this.findEntity(id);
    if (dto.title !== undefined) entity.title = dto.title.trim();
    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.candidateId !== undefined) entity.candidateId = dto.candidateId || null;
    if (dto.location !== undefined) entity.location = this.nullableText(dto.location);
    if (dto.scheduledAt !== undefined) entity.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (dto.endAt !== undefined) entity.endAt = dto.endAt ? new Date(dto.endAt) : null;
    if (dto.purpose !== undefined) entity.purpose = this.nullableText(dto.purpose);
    if (dto.description !== undefined) entity.description = this.nullableText(dto.description);
    if (dto.result !== undefined) entity.result = this.nullableText(dto.result);
    if (dto.summary !== undefined) entity.summary = this.nullableText(dto.summary);
    if (dto.nextSteps !== undefined) entity.nextSteps = this.nullableText(dto.nextSteps);

    await this.interactions.save(entity);
    return this.getInteraction(entity.id);
  }

  async removeInteraction(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.interactions.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Interaction> {
    const entity = await this.interactions.findOne({ where: tenantWhere<Interaction>(this.tenant, { id }, { branch: true }), relations: { candidate: true } });
    if (!entity) throw new NotFoundException('Muloqot topilmadi');
    return entity;
  }

  private toResponse(i: Interaction): InteractionResponse {
    const candidateName = i.candidate
      ? `${i.candidate.firstName ?? ''} ${i.candidate.lastName ?? ''}`.trim() || null
      : null;
    return {
      id: i.id,
      title: i.title,
      type: i.type,
      status: i.status,
      candidateId: i.candidateId ?? null,
      candidateName,
      location: i.location ?? null,
      scheduledAt: i.scheduledAt ?? null,
      endAt: i.endAt ?? null,
      purpose: i.purpose ?? null,
      description: i.description ?? null,
      result: i.result ?? null,
      summary: i.summary ?? null,
      nextSteps: i.nextSteps ?? null,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
