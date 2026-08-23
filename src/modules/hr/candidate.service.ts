import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  CandidateQueryDto,
  CreateCandidateDto,
  UpdateCandidateDto,
  UpdateCandidateStageDto,
} from './dto/candidate.dto';
import { Candidate } from './entities/candidate.entity';
import { CandidateStage } from './enums/hr.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface CandidateResponse {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  vacancyId: string | null;
  vacancyTitle: string | null;
  recruiterId: string | null;
  recruiterName: string | null;
  stage: CandidateStage;
  stageStatus: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateListResult {
  items: CandidateResponse[];
  meta: PageMeta;
}

@Injectable()
export class CandidateService {
  constructor(@InjectRepository(Candidate) private readonly candidates: Repository<Candidate>, private readonly tenant: TenantContextService) {}

  async findCandidates(query: CandidateQueryDto): Promise<CandidateListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.candidates
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.vacancy', 'vacancy')
      .leftJoinAndSelect('c.recruiter', 'recruiter')
      .where('c.deleted_at IS NULL');
    applyTenantScope(qb, 'c', this.tenant, { branch: true });

    if (query.stage) qb.andWhere('c.stage = :stage', { stage: query.stage });
    if (query.vacancyId) qb.andWhere('c.vacancy_id = :vid', { vid: query.vacancyId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('c.first_name ILIKE :q', { q: `%${search}%` })
            .orWhere('c.last_name ILIKE :q', { q: `%${search}%` })
            .orWhere('c.email ILIKE :q', { q: `%${search}%` })
            .orWhere('c.phone ILIKE :q', { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((c) => this.toResponse(c)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getCandidate(id: string): Promise<CandidateResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createCandidate(dto: CreateCandidateDto): Promise<CandidateResponse> {
    const entity = await this.candidates.save(
      this.candidates.create({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.trim(),
        phone: this.nullableText(dto.phone),
        vacancyId: dto.vacancyId ?? null,
        recruiterId: dto.recruiterId ?? null,
        stage: dto.stage ?? CandidateStage.NEW,
        stageStatus: this.nullableText(dto.stageStatus),
        notes: this.nullableText(dto.notes),
      }),
    );
    return this.getCandidate(entity.id);
  }

  async updateCandidate(id: string, dto: UpdateCandidateDto): Promise<CandidateResponse> {
    const entity = await this.findEntity(id);
    if (dto.firstName !== undefined) entity.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) entity.lastName = dto.lastName.trim();
    if (dto.email !== undefined) entity.email = dto.email.trim();
    if (dto.phone !== undefined) entity.phone = this.nullableText(dto.phone);
    if (dto.vacancyId !== undefined) entity.vacancyId = dto.vacancyId || null;
    if (dto.recruiterId !== undefined) entity.recruiterId = dto.recruiterId || null;
    if (dto.stage !== undefined) entity.stage = dto.stage;
    if (dto.stageStatus !== undefined) entity.stageStatus = this.nullableText(dto.stageStatus);
    if (dto.notes !== undefined) entity.notes = this.nullableText(dto.notes);

    await this.candidates.save(entity);
    return this.getCandidate(entity.id);
  }

  async updateStage(id: string, dto: UpdateCandidateStageDto): Promise<CandidateResponse> {
    const entity = await this.findEntity(id);
    entity.stage = dto.stage;
    entity.stageStatus = this.nullableText(dto.stageStatus);
    await this.candidates.save(entity);
    return this.getCandidate(entity.id);
  }

  async removeCandidate(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.candidates.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Candidate> {
    const entity = await this.candidates.findOne({
      where: tenantWhere<Candidate>(this.tenant, { id }, { branch: true }),
      relations: { vacancy: true, recruiter: true },
    });
    if (!entity) throw new NotFoundException('Nomzod topilmadi');
    return entity;
  }

  private toResponse(c: Candidate): CandidateResponse {
    const fullName = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim().replace(/\s+/g, ' ');
    const recruiterName = c.recruiter
      ? `${c.recruiter.lastName ?? ''} ${c.recruiter.firstName ?? ''}`.trim() || null
      : null;
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName,
      email: c.email,
      phone: c.phone ?? null,
      vacancyId: c.vacancyId ?? null,
      vacancyTitle: c.vacancy?.title ?? null,
      recruiterId: c.recruiterId ?? null,
      recruiterName,
      stage: c.stage,
      stageStatus: c.stageStatus ?? null,
      notes: c.notes ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
