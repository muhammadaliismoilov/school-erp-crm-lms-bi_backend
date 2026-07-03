import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { pickLocalizedText } from '../../common/i18n/locale';
import { Branch } from '../settings/entities/branch.entity';
import { School } from '../settings/entities/school.entity';
import { CreateDepartmentDto, DepartmentQueryDto, UpdateDepartmentDto } from './dto/hr.dto';
import { Department, DepartmentStatus } from './entities/department.entity';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface DepartmentResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  schoolId: string | null;
  schoolName: string | null;
  filialId: string | null;
  filialLabel: string | null;
  /** Bo'lim egasi yorlig'i: filial bo'lsa filial nomi, aks holda "Maktab (Bosh ofis)". */
  ownerLabel: string | null;
  parentId: string | null;
  parentName: string | null;
  telegramChatId: string | null;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentListResult {
  items: DepartmentResponse[];
  meta: PageMeta;
}

export interface BranchOption {
  id: string;
  label: string;
}

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(School) private readonly schools: Repository<School>,
    private readonly tenant: TenantContextService,
  ) {}

  async findDepartments(query: DepartmentQueryDto): Promise<DepartmentListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.departments
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.filial', 'filial')
      .leftJoinAndSelect('filial.school', 'fschool')
      .leftJoinAndSelect('d.school', 'school')
      .leftJoinAndSelect('d.parent', 'parent')
      .where('d.deleted_at IS NULL');
    applyTenantScope(qb, 'd', this.tenant, { branch: true });

    if (query.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query.filialId) qb.andWhere('d.filial_id = :fil', { fil: query.filialId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('d.name ILIKE :q', { q: `%${search}%` }).orWhere('d.code ILIKE :q', { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((d) => this.toResponse(d)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getDepartment(id: string): Promise<DepartmentResponse> {
    const entity = await this.findEntity(id);
    return this.toResponse(entity);
  }

  async createDepartment(dto: CreateDepartmentDto): Promise<DepartmentResponse> {
    await this.assertSchool(dto.schoolId);
    await this.assertFilial(dto.filialId);
    await this.assertParent(dto.parentId);

    const code = await this.resolveCode(dto.code, dto.name);
    const entity = await this.departments.save(
      this.departments.create({
        name: dto.name.trim(),
        code,
        description: this.nullableText(dto.description),
        // Egasi bittadan: filial tanlansa — maktab tozalanadi va aksincha.
        schoolId: dto.filialId ? null : dto.schoolId ?? null,
        filialId: dto.filialId ?? null,
        parentId: dto.parentId ?? null,
        telegramChatId: this.nullableText(dto.telegramChatId),
        status: dto.status ?? DepartmentStatus.ACTIVE,
      }),
    );
    return this.getDepartment(entity.id);
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<DepartmentResponse> {
    const entity = await this.findEntity(id);
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Bo‘lim o‘ziga ota bo‘la olmaydi');
    }
    await this.assertSchool(dto.schoolId);
    await this.assertFilial(dto.filialId);
    await this.assertParent(dto.parentId);

    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.code !== undefined) entity.code = dto.code.trim();
    if (dto.description !== undefined) entity.description = this.nullableText(dto.description);
    // Egasi (maktab/filial) yangilanishi — bittadan bo'ladi.
    if (dto.filialId !== undefined) {
      entity.filialId = dto.filialId ?? null;
      if (dto.filialId) entity.schoolId = null;
    }
    if (dto.schoolId !== undefined) {
      entity.schoolId = dto.schoolId ?? null;
      if (dto.schoolId) entity.filialId = null;
    }
    if (dto.parentId !== undefined) entity.parentId = dto.parentId ?? null;
    if (dto.telegramChatId !== undefined) entity.telegramChatId = this.nullableText(dto.telegramChatId);
    if (dto.status !== undefined) entity.status = dto.status;

    await this.departments.save(entity);
    return this.getDepartment(entity.id);
  }

  async removeDepartment(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.departments.softDelete(entity.id);
  }

  /** Filial (branch) tanlash uchun ro'yxat: "Maktab , Filial" ko'rinishida. */
  async branchOptions(): Promise<BranchOption[]> {
    const rows = await this.branches.find({
      where: { isActive: true },
      relations: { school: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((b) => ({ id: b.id, label: this.branchLabel(b) }));
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Department> {
    const entity = await this.departments.findOne({
      where: { id },
      relations: { filial: { school: true }, school: true, parent: true },
    });
    if (!entity) throw new NotFoundException('Bo‘lim topilmadi');
    return entity;
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

  private async assertParent(parentId?: string): Promise<void> {
    if (!parentId) return;
    const exists = await this.departments.findOne({ where: tenantWhere<Department>(this.tenant, { id: parentId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Ota bo‘lim topilmadi');
  }

  private async resolveCode(code: string | undefined, name: string): Promise<string> {
    const base = (code?.trim() || this.slug(name)) || 'department';
    let candidate = base;
    let n = 1;
    while (await this.departments.findOne({ where: tenantWhere<Department>(this.tenant, { code: candidate }, { branch: true }), withDeleted: true })) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    return candidate.slice(0, 40);
  }

  private branchLabel(b: Branch): string {
    const branchName = b.name ? pickLocalizedText(b.name, 'uz') : '';
    const schoolName = b.school?.name ? pickLocalizedText(b.school.name, 'uz') : '';
    return [schoolName, branchName].filter(Boolean).join(' , ') || branchName || schoolName || '—';
  }

  private toResponse(d: Department): DepartmentResponse {
    const schoolName = d.school?.name ? pickLocalizedText(d.school.name, 'uz') : null;
    const filialLabel = d.filial ? this.branchLabel(d.filial) : null;
    const ownerLabel = filialLabel ?? (schoolName ? `${schoolName} (Bosh ofis)` : null);
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description ?? null,
      schoolId: d.schoolId ?? null,
      schoolName,
      filialId: d.filialId ?? null,
      filialLabel,
      ownerLabel,
      parentId: d.parentId ?? null,
      parentName: d.parent?.name ?? null,
      telegramChatId: d.telegramChatId ?? null,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private slug(value: string): string {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'department'
    );
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
