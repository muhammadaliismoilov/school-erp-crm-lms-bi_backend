import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pickLocalizedText } from '../../common/i18n/locale';
import type { LocalizedText } from '../../common/i18n/locale';
import { Branch } from '../settings/entities/branch.entity';
import { School } from '../settings/entities/school.entity';
import { BranchQueryDto, CreateBranchDto, UpdateBranchDto } from './dto/hr.dto';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface BranchNode {
  id: string;
  name: string;
  schoolId: string | null;
  schoolName: string | null;
  parentId: string | null;
  parentName: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
  createdAt: Date;
  children: BranchNode[];
}

export interface BranchListResult {
  items: BranchNode[];
  meta: PageMeta;
}

export interface BranchOption {
  id: string;
  label: string;
}

@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(School) private readonly schools: Repository<School>,
  ) {}

  /** Sahifalangan daraxt: qidiruvsiz — ildizlar + ichki bolalar; qidiruvda — yassi. */
  async findBranches(query: BranchQueryDto): Promise<BranchListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const all = await this.branches.find({
      where: {},
      relations: { school: true },
      order: { createdAt: 'DESC' },
      withDeleted: false,
    });

    const labelOf = new Map(all.map((b) => [b.id, this.toLabel(b)]));
    const search = this.nullableText(query.search);

    if (search) {
      const q = search.toLowerCase();
      const matched = all.filter((b) => (labelOf.get(b.id) ?? '').toLowerCase().includes(q));
      const total = matched.length;
      const slice = matched.slice((page - 1) * limit, page * limit);
      return {
        items: slice.map((b) => this.toNode(b, labelOf, [])),
        meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
      };
    }

    // Daraxt: faqat mavjud filiallar orasidagi ota-bolalar bog'lanadi.
    const ids = new Set(all.map((b) => b.id));
    const childrenOf = new Map<string, Branch[]>();
    const roots: Branch[] = [];
    for (const b of all) {
      if (b.parentId && ids.has(b.parentId)) {
        const arr = childrenOf.get(b.parentId) ?? [];
        arr.push(b);
        childrenOf.set(b.parentId, arr);
      } else {
        roots.push(b);
      }
    }

    const total = roots.length;
    const slice = roots.slice((page - 1) * limit, page * limit);
    const build = (b: Branch): BranchNode =>
      this.toNode(
        b,
        labelOf,
        (childrenOf.get(b.id) ?? []).map((c) => build(c)),
      );

    return {
      items: slice.map((b) => build(b)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async options(): Promise<BranchOption[]> {
    const all = await this.branches.find({ relations: { school: true }, order: { createdAt: 'DESC' } });
    return all.map((b) => ({ id: b.id, label: this.toLabel(b) }));
  }

  /** Boshqaruv (Maktablar) bo'limida yaratilgan maktablar — filial ularga bog'lanadi. */
  async schoolOptions(): Promise<BranchOption[]> {
    const all = await this.schools.find({ order: { createdAt: 'DESC' } });
    return all.map((s) => ({
      id: s.id,
      label: s.name ? pickLocalizedText(s.name, 'uz') : s.id,
    }));
  }

  async getBranch(id: string): Promise<Branch> {
    const entity = await this.branches.findOne({ where: { id }, relations: { school: true, parent: true } });
    if (!entity) throw new NotFoundException('Filial topilmadi');
    return entity;
  }

  async createBranch(dto: CreateBranchDto): Promise<BranchNode> {
    await this.assertParent(dto.parentId);
    await this.assertSchool(dto.schoolId);

    const entity = await this.branches.save(
      this.branches.create({
        name: this.localized(dto.name),
        parentId: dto.parentId ?? null,
        schoolId: dto.schoolId ?? null,
        isHeadOffice: dto.isHeadOffice ?? false,
        isActive: dto.isActive ?? true,
      }),
    );
    return this.toNodeById(entity.id);
  }

  async updateBranch(id: string, dto: UpdateBranchDto): Promise<BranchNode> {
    const entity = await this.getBranch(id);
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Filial o‘ziga ota bo‘la olmaydi');
    }
    await this.assertParent(dto.parentId);
    await this.assertSchool(dto.schoolId);

    if (dto.name !== undefined) entity.name = this.localized(dto.name);
    if (dto.parentId !== undefined) entity.parentId = dto.parentId ?? null;
    if (dto.schoolId !== undefined) entity.schoolId = dto.schoolId ?? null;
    if (dto.isHeadOffice !== undefined) entity.isHeadOffice = dto.isHeadOffice;
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;

    await this.branches.save(entity);
    return this.toNodeById(entity.id);
  }

  async removeBranch(id: string): Promise<void> {
    const entity = await this.getBranch(id);
    await this.branches.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async toNodeById(id: string): Promise<BranchNode> {
    const b = await this.getBranch(id);
    const labelOf = new Map<string, string>([[b.id, this.toLabel(b)]]);
    if (b.parent) labelOf.set(b.parent.id, this.toLabel(b.parent));
    return this.toNode(b, labelOf, []);
  }

  private toNode(b: Branch, labelOf: Map<string, string>, children: BranchNode[]): BranchNode {
    return {
      id: b.id,
      name: labelOf.get(b.id) ?? this.toLabel(b),
      schoolId: b.schoolId ?? null,
      schoolName: b.school?.name ? pickLocalizedText(b.school.name, 'uz') : null,
      parentId: b.parentId ?? null,
      parentName: b.parentId ? labelOf.get(b.parentId) ?? null : null,
      isHeadOffice: b.isHeadOffice,
      isActive: b.isActive,
      createdAt: b.createdAt,
      children,
    };
  }

  private toLabel(b: Branch): string {
    const branchName = b.name ? pickLocalizedText(b.name, 'uz') : '';
    const schoolName = b.school?.name ? pickLocalizedText(b.school.name, 'uz') : '';
    if (schoolName && branchName) return `${schoolName} , ${branchName}`;
    return branchName || schoolName || '—';
  }

  private localized(value: string): LocalizedText {
    const v = value.trim();
    return { uz: v, ru: v, en: v };
  }

  private async assertParent(parentId?: string): Promise<void> {
    if (!parentId) return;
    const exists = await this.branches.findOne({ where: { id: parentId } });
    if (!exists) throw new NotFoundException('Ota filial topilmadi');
  }

  private async assertSchool(schoolId?: string): Promise<void> {
    if (!schoolId) return;
    const exists = await this.schools.findOne({ where: { id: schoolId } });
    if (!exists) throw new NotFoundException('Maktab topilmadi');
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
