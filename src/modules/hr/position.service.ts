import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { pickLocalizedText } from '../../common/i18n/locale';
import { Branch } from '../settings/entities/branch.entity';
import { School } from '../settings/entities/school.entity';
import { CreatePositionDto, PositionQueryDto, UpdatePositionDto } from './dto/hr.dto';
import { Department } from './entities/department.entity';
import { Position, PositionStatus } from './entities/position.entity';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface PositionResponse {
  id: string;
  title: string;
  code: string;
  description: string | null;
  baseSalary: number;
  departmentId: string | null;
  departmentName: string | null;
  schoolId: string | null;
  schoolName: string | null;
  filialId: string | null;
  filialLabel: string | null;
  /** Egasi yorlig'i: filial bo'lsa filial nomi, aks holda "Maktab (Bosh ofis)". */
  ownerLabel: string | null;
  status: PositionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PositionListResult {
  items: PositionResponse[];
  meta: PageMeta;
}

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position) private readonly positions: Repository<Position>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(School) private readonly schools: Repository<School>,
    private readonly tenant: TenantContextService,
  ) {}

  async findPositions(query: PositionQueryDto): Promise<PositionListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.positions
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.department', 'department')
      .leftJoinAndSelect('p.filial', 'filial')
      .leftJoinAndSelect('filial.school', 'fschool')
      .leftJoinAndSelect('p.school', 'school')
      .where('p.deleted_at IS NULL');
    applyTenantScope(qb, 'p', this.tenant, { branch: true });

    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.departmentId) qb.andWhere('p.department_id = :dep', { dep: query.departmentId });
    if (query.filialId) qb.andWhere('p.filial_id = :fil', { fil: query.filialId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('p.title ILIKE :q', { q: `%${search}%` }).orWhere('p.code ILIKE :q', { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((p) => this.toResponse(p)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getPosition(id: string): Promise<PositionResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createPosition(dto: CreatePositionDto): Promise<PositionResponse> {
    await this.assertDepartment(dto.departmentId);
    await this.assertSchool(dto.schoolId);
    await this.assertFilial(dto.filialId);

    const code = await this.resolveCode(dto.code, dto.title);
    const entity = await this.positions.save(
      this.positions.create({
        title: dto.title.trim(),
        code,
        description: this.nullableText(dto.description),
        baseSalary: dto.baseSalary ?? 0,
        departmentId: dto.departmentId ?? null,
        // Egasi bittadan: filial tanlansa — maktab tozalanadi.
        schoolId: dto.filialId ? null : dto.schoolId ?? null,
        filialId: dto.filialId ?? null,
        status: dto.status ?? PositionStatus.ACTIVE,
      }),
    );
    return this.getPosition(entity.id);
  }

  async updatePosition(id: string, dto: UpdatePositionDto): Promise<PositionResponse> {
    const entity = await this.findEntity(id);
    await this.assertDepartment(dto.departmentId);
    await this.assertSchool(dto.schoolId);
    await this.assertFilial(dto.filialId);

    if (dto.title !== undefined) entity.title = dto.title.trim();
    if (dto.code !== undefined) entity.code = dto.code.trim();
    if (dto.description !== undefined) entity.description = this.nullableText(dto.description);
    if (dto.baseSalary !== undefined) entity.baseSalary = dto.baseSalary;
    if (dto.departmentId !== undefined) entity.departmentId = dto.departmentId ?? null;
    // Egasi (maktab/filial) — o'zaro istisno.
    if (dto.filialId !== undefined) {
      entity.filialId = dto.filialId ?? null;
      if (dto.filialId) entity.schoolId = null;
    }
    if (dto.schoolId !== undefined) {
      entity.schoolId = dto.schoolId ?? null;
      if (dto.schoolId) entity.filialId = null;
    }
    if (dto.status !== undefined) entity.status = dto.status;

    await this.positions.save(entity);
    return this.getPosition(entity.id);
  }

  async removePosition(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.positions.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Position> {
    const entity = await this.positions.findOne({
      where: { id },
      relations: { department: true, filial: { school: true }, school: true },
    });
    if (!entity) throw new NotFoundException('Lavozim topilmadi');
    return entity;
  }

  private async assertDepartment(departmentId?: string): Promise<void> {
    if (!departmentId) return;
    const exists = await this.departments.findOne({ where: tenantWhere<Department>(this.tenant, { id: departmentId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Bo‘lim topilmadi');
  }

  private async assertSchool(schoolId?: string): Promise<void> {
    if (!schoolId) return;
    const exists = await this.schools.findOne({ where: tenantWhere<School>(this.tenant, { id: schoolId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Maktab topilmadi');
  }

  private async assertFilial(filialId?: string): Promise<void> {
    if (!filialId) return;
    const exists = await this.branches.findOne({ where: tenantWhere<Branch>(this.tenant, { id: filialId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Filial topilmadi');
  }

  private async resolveCode(code: string | undefined, title: string): Promise<string> {
    const base = (code?.trim() || this.slug(title)) || 'position';
    let candidate = base;
    let n = 1;
    while (await this.positions.findOne({ where: tenantWhere<Position>(this.tenant, { code: candidate }, { branch: true }), withDeleted: true })) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    return candidate.slice(0, 40);
  }

  private branchLabel(b: Branch): string {
    const branchName = b.name ? pickLocalizedText(b.name, 'uz') : '';
    const schoolName = b.school?.name ? pickLocalizedText(b.school.name, 'uz') : '';
    if (schoolName && branchName) return `${schoolName} , ${branchName}`;
    return branchName || schoolName || '—';
  }

  private toResponse(p: Position): PositionResponse {
    const schoolName = p.school?.name ? pickLocalizedText(p.school.name, 'uz') : null;
    const filialLabel = p.filial ? this.branchLabel(p.filial) : null;
    const ownerLabel = filialLabel ?? (schoolName ? `${schoolName} (Bosh ofis)` : null);
    return {
      id: p.id,
      title: p.title,
      code: p.code,
      description: p.description ?? null,
      baseSalary: Number(p.baseSalary) || 0,
      departmentId: p.departmentId ?? null,
      departmentName: p.department?.name ?? null,
      schoolId: p.schoolId ?? null,
      schoolName,
      filialId: p.filialId ?? null,
      filialLabel,
      ownerLabel,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private slug(value: string): string {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'position'
    );
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
