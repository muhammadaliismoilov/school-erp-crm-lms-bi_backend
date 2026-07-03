import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateProjectFullDto, ProjectQueryDto, UpdateProjectFullDto } from './dto/project.dto';
import { Project } from './entities/project.entity';
import { ProjectStatus } from './enums/hr.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectListResult {
  items: ProjectResponse[];
  meta: PageMeta;
}

@Injectable()
export class ProjectService {
  constructor(@InjectRepository(Project) private readonly projects: Repository<Project>, private readonly tenant: TenantContextService) {}

  async findProjects(query: ProjectQueryDto): Promise<ProjectListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.projects.createQueryBuilder('p').where('p.deleted_at IS NULL');
    applyTenantScope(qb, 'p', this.tenant, { branch: true });
    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    const search = this.nullableText(query.search);
    if (search) qb.andWhere('p.name ILIKE :q', { q: `%${search}%` });

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

  async options(): Promise<{ id: string; name: string; color: string | null }[]> {
    const items = await this.projects.find({
      where: { status: ProjectStatus.ACTIVE },
      order: { name: 'ASC' },
    });
    return items.map((p) => ({ id: p.id, name: p.name, color: p.color ?? null }));
  }

  async getProject(id: string): Promise<ProjectResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createProject(dto: CreateProjectFullDto): Promise<ProjectResponse> {
    await this.assertUniqueName(dto.name);
    const entity = await this.projects.save(
      this.projects.create({
        name: dto.name.trim(),
        description: this.nullableText(dto.description),
        color: dto.color ?? null,
        status: dto.status ?? ProjectStatus.ACTIVE,
      }),
    );
    return this.getProject(entity.id);
  }

  async updateProject(id: string, dto: UpdateProjectFullDto): Promise<ProjectResponse> {
    const entity = await this.findEntity(id);
    if (dto.name !== undefined) {
      await this.assertUniqueName(dto.name, id);
      entity.name = dto.name.trim();
    }
    if (dto.description !== undefined) entity.description = this.nullableText(dto.description);
    if (dto.color !== undefined) entity.color = dto.color || null;
    if (dto.status !== undefined) entity.status = dto.status;
    await this.projects.save(entity);
    return this.getProject(entity.id);
  }

  async removeProject(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.projects.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Project> {
    const entity = await this.projects.findOne({ where: tenantWhere<Project>(this.tenant, { id }, { branch: true }) });
    if (!entity) throw new NotFoundException('Loyiha topilmadi');
    return entity;
  }

  private async assertUniqueName(name: string, excludeId?: string): Promise<void> {
    const where = excludeId ? { name: name.trim(), id: Not(excludeId) } : { name: name.trim() };
    const exists = await this.projects.findOne({ where });
    if (exists) throw new ConflictException('Bu nomli loyiha allaqachon mavjud');
  }

  private toResponse(p: Project): ProjectResponse {
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      color: p.color ?? null,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
