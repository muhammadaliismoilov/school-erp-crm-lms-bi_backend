import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateGeofenceFullDto, GeofenceQueryDto, UpdateGeofenceFullDto } from './dto/geofence.dto';
import { Geofence } from './entities/geofence.entity';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface GeofenceResponse {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radiusM: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeofenceListResult {
  items: GeofenceResponse[];
  meta: PageMeta;
}

@Injectable()
export class GeofenceService {
  constructor(@InjectRepository(Geofence) private readonly geofences: Repository<Geofence>, private readonly tenant: TenantContextService) {}

  async findGeofences(query: GeofenceQueryDto): Promise<GeofenceListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.geofences.createQueryBuilder('g').where('g.deleted_at IS NULL');
    applyTenantScope(qb, 'g', this.tenant, { branch: true });
    const search = this.nullableText(query.search);
    if (search) qb.andWhere('g.name ILIKE :q', { q: `%${search}%` });

    const [items, total] = await qb
      .orderBy('g.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((g) => this.toResponse(g)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async options(): Promise<{ id: string; name: string }[]> {
    const items = await this.geofences.find({ where: { isActive: true }, order: { name: 'ASC' } });
    return items.map((g) => ({ id: g.id, name: g.name }));
  }

  async getGeofence(id: string): Promise<GeofenceResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createGeofence(dto: CreateGeofenceFullDto): Promise<GeofenceResponse> {
    await this.assertUniqueName(dto.name);
    const entity = await this.geofences.save(
      this.geofences.create({
        name: dto.name.trim(),
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        radiusM: dto.radiusM ?? null,
        isActive: dto.isActive ?? true,
      }),
    );
    return this.getGeofence(entity.id);
  }

  async updateGeofence(id: string, dto: UpdateGeofenceFullDto): Promise<GeofenceResponse> {
    const entity = await this.findEntity(id);
    if (dto.name !== undefined) {
      await this.assertUniqueName(dto.name, id);
      entity.name = dto.name.trim();
    }
    if (dto.latitude !== undefined) entity.latitude = dto.latitude ?? null;
    if (dto.longitude !== undefined) entity.longitude = dto.longitude ?? null;
    if (dto.radiusM !== undefined) entity.radiusM = dto.radiusM ?? null;
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;
    await this.geofences.save(entity);
    return this.getGeofence(entity.id);
  }

  async removeGeofence(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.geofences.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<Geofence> {
    const entity = await this.geofences.findOne({ where: tenantWhere<Geofence>(this.tenant, { id }, { branch: true }) });
    if (!entity) throw new NotFoundException('Geozona topilmadi');
    return entity;
  }

  private async assertUniqueName(name: string, excludeId?: string): Promise<void> {
    const where = excludeId ? { name: name.trim(), id: Not(excludeId) } : { name: name.trim() };
    const exists = await this.geofences.findOne({ where });
    if (exists) throw new ConflictException('Bu nomli geozona allaqachon mavjud');
  }

  private toResponse(g: Geofence): GeofenceResponse {
    return {
      id: g.id,
      name: g.name,
      latitude: g.latitude != null ? Number(g.latitude) : null,
      longitude: g.longitude != null ? Number(g.longitude) : null,
      radiusM: g.radiusM ?? null,
      isActive: g.isActive,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
