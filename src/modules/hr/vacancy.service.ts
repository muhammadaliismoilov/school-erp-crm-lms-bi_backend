import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateVacancyDto, UpdateVacancyDto, VacancyQueryDto } from './dto/vacancy.dto';
import { Vacancy } from './entities/vacancy.entity';
import { VacancyStatus } from './enums/hr.enums';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface VacancyResponse {
  id: string;
  title: string;
  status: VacancyStatus;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionTitle: string | null;
  recruiterId: string | null;
  recruiterName: string | null;
  minSalary: number | null;
  maxSalary: number | null;
  responsibilities: string | null;
  requirements: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VacancyListResult {
  items: VacancyResponse[];
  meta: PageMeta;
}

@Injectable()
export class VacancyService {
  constructor(@InjectRepository(Vacancy) private readonly vacancies: Repository<Vacancy>) {}

  async findVacancies(query: VacancyQueryDto): Promise<VacancyListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.vacancies
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.department', 'department')
      .leftJoinAndSelect('v.position', 'position')
      .leftJoinAndSelect('v.recruiter', 'recruiter')
      .where('v.deleted_at IS NULL');

    if (query.status) qb.andWhere('v.status = :status', { status: query.status });
    if (query.departmentId) qb.andWhere('v.department_id = :did', { did: query.departmentId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('v.title ILIKE :q', { q: `%${search}%` }).orWhere('department.name ILIKE :q', { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('v.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((v) => this.toResponse(v)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getVacancy(id: string): Promise<VacancyResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createVacancy(dto: CreateVacancyDto): Promise<VacancyResponse> {
    this.assertSalary(dto.minSalary, dto.maxSalary);
    const entity = await this.vacancies.save(
      this.vacancies.create({
        title: dto.title.trim(),
        status: dto.status ?? VacancyStatus.OPEN,
        departmentId: dto.departmentId ?? null,
        positionId: dto.positionId ?? null,
        recruiterId: dto.recruiterId ?? null,
        minSalary: dto.minSalary ?? null,
        maxSalary: dto.maxSalary ?? null,
        responsibilities: this.nullableText(dto.responsibilities),
        requirements: this.nullableText(dto.requirements),
      }),
    );
    return this.getVacancy(entity.id);
  }

  async updateVacancy(id: string, dto: UpdateVacancyDto): Promise<VacancyResponse> {
    const entity = await this.findEntity(id);
    if (dto.title !== undefined) entity.title = dto.title.trim();
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.departmentId !== undefined) entity.departmentId = dto.departmentId || null;
    if (dto.positionId !== undefined) entity.positionId = dto.positionId || null;
    if (dto.recruiterId !== undefined) entity.recruiterId = dto.recruiterId || null;
    if (dto.minSalary !== undefined) entity.minSalary = dto.minSalary ?? null;
    if (dto.maxSalary !== undefined) entity.maxSalary = dto.maxSalary ?? null;
    this.assertSalary(entity.minSalary, entity.maxSalary);
    if (dto.responsibilities !== undefined) entity.responsibilities = this.nullableText(dto.responsibilities);
    if (dto.requirements !== undefined) entity.requirements = this.nullableText(dto.requirements);

    await this.vacancies.save(entity);
    return this.getVacancy(entity.id);
  }

  async removeVacancy(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.vacancies.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Vacancy> {
    const entity = await this.vacancies.findOne({
      where: { id },
      relations: { department: true, position: true, recruiter: true },
    });
    if (!entity) throw new NotFoundException('Vakansiya topilmadi');
    return entity;
  }

  private assertSalary(min?: number | null, max?: number | null): void {
    if (min != null && max != null && Number(max) < Number(min)) {
      throw new BadRequestException('Maksimal maosh minimaldan kichik bo‘lishi mumkin emas');
    }
  }

  private toResponse(v: Vacancy): VacancyResponse {
    const recruiterName = v.recruiter
      ? `${v.recruiter.lastName ?? ''} ${v.recruiter.firstName ?? ''}`.trim() || null
      : null;
    return {
      id: v.id,
      title: v.title,
      status: v.status,
      departmentId: v.departmentId ?? null,
      departmentName: v.department?.name ?? null,
      positionId: v.positionId ?? null,
      positionTitle: v.position?.title ?? null,
      recruiterId: v.recruiterId ?? null,
      recruiterName,
      minSalary: v.minSalary != null ? Number(v.minSalary) : null,
      maxSalary: v.maxSalary != null ? Number(v.maxSalary) : null,
      responsibilities: v.responsibilities ?? null,
      requirements: v.requirements ?? null,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
