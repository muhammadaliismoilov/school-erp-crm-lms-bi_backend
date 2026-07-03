import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AttendanceQueryDto, CreateAttendanceDto, ReviewAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { Geofence } from './entities/geofence.entity';
import { StaffMember } from './entities/staff-member.entity';
import { AttendanceAction, AttendanceReviewStatus } from './enums/hr.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface AttendanceResponse {
  id: string;
  staffMemberId: string;
  staffName: string | null;
  action: AttendanceAction;
  recordedAt: Date;
  latitude: number | null;
  longitude: number | null;
  geofenceId: string | null;
  geofenceName: string | null;
  deviceInfo: string | null;
  status: AttendanceReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceListResult {
  items: AttendanceResponse[];
  meta: PageMeta;
}

export interface GeofenceOption {
  id: string;
  name: string;
}

const REVIEW_STATUSES = [AttendanceReviewStatus.APPROVED, AttendanceReviewStatus.REJECTED];

@Injectable()
export class AttendanceHrService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>,
    @InjectRepository(Geofence) private readonly geofences: Repository<Geofence>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    private readonly tenant: TenantContextService,
  ) {}

  async findRecords(query: AttendanceQueryDto): Promise<AttendanceListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.records
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.staffMember', 'staff')
      .leftJoinAndSelect('a.geofence', 'geofence')
      .where('a.deleted_at IS NULL');
    applyTenantScope(qb, 'a', this.tenant, { branch: true });

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.action) qb.andWhere('a.action = :action', { action: query.action });
    if (query.staffMemberId) qb.andWhere('a.staff_member_id = :sid', { sid: query.staffMemberId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('staff.first_name ILIKE :q', { q: `%${search}%` })
            .orWhere('staff.last_name ILIKE :q', { q: `%${search}%` })
            .orWhere("CONCAT(staff.last_name, ' ', staff.first_name) ILIKE :q", { q: `%${search}%` });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('a.recordedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((a) => this.toResponse(a)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getRecord(id: string): Promise<AttendanceResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createRecord(dto: CreateAttendanceDto): Promise<AttendanceResponse> {
    await this.assertStaff(dto.staffMemberId);
    await this.assertGeofence(dto.geofenceId);

    const entity = await this.records.save(
      this.records.create({
        staffMemberId: dto.staffMemberId,
        action: dto.action,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        geofenceId: dto.geofenceId ?? null,
        deviceInfo: this.nullableText(dto.deviceInfo),
        status: dto.status ?? AttendanceReviewStatus.PENDING,
      }),
    );
    return this.getRecord(entity.id);
  }

  async updateRecord(id: string, dto: UpdateAttendanceDto): Promise<AttendanceResponse> {
    const entity = await this.findEntity(id);
    if (dto.staffMemberId !== undefined) {
      await this.assertStaff(dto.staffMemberId);
      entity.staffMemberId = dto.staffMemberId;
    }
    if (dto.geofenceId !== undefined) {
      await this.assertGeofence(dto.geofenceId);
      entity.geofenceId = dto.geofenceId ?? null;
    }
    if (dto.action !== undefined) entity.action = dto.action;
    if (dto.recordedAt !== undefined) entity.recordedAt = new Date(dto.recordedAt);
    if (dto.latitude !== undefined) entity.latitude = dto.latitude ?? null;
    if (dto.longitude !== undefined) entity.longitude = dto.longitude ?? null;
    if (dto.deviceInfo !== undefined) entity.deviceInfo = this.nullableText(dto.deviceInfo);
    if (dto.status !== undefined) entity.status = dto.status;

    await this.records.save(entity);
    return this.getRecord(entity.id);
  }

  async reviewRecord(id: string, dto: ReviewAttendanceDto): Promise<AttendanceResponse> {
    if (!REVIEW_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Holat approved yoki rejected bo‘lishi kerak');
    }
    const entity = await this.findEntity(id);
    entity.status = dto.status;
    await this.records.save(entity);
    return this.getRecord(entity.id);
  }

  async removeRecord(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.records.softDelete(entity.id);
  }

  async geofenceOptions(): Promise<GeofenceOption[]> {
    const rows = await this.geofences.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
    return rows.map((g) => ({ id: g.id, name: g.name }));
  }

  async createGeofence(name: string): Promise<GeofenceOption> {
    const entity = await this.geofences.save(this.geofences.create({ name: name.trim() }));
    return { id: entity.id, name: entity.name };
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<AttendanceRecord> {
    const entity = await this.records.findOne({ where: tenantWhere<AttendanceRecord>(this.tenant, { id }, { branch: true }), relations: { staffMember: true, geofence: true } });
    if (!entity) throw new NotFoundException('Davomat yozuvi topilmadi');
    return entity;
  }

  private async assertStaff(staffMemberId: string): Promise<void> {
    const exists = await this.staff.findOne({ where: tenantWhere<StaffMember>(this.tenant, { id: staffMemberId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Xodim topilmadi');
  }

  private async assertGeofence(geofenceId?: string): Promise<void> {
    if (!geofenceId) return;
    const exists = await this.geofences.findOne({ where: tenantWhere<Geofence>(this.tenant, { id: geofenceId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Geofence topilmadi');
  }

  private toResponse(a: AttendanceRecord): AttendanceResponse {
    const staffName = a.staffMember
      ? `${a.staffMember.lastName ?? ''} ${a.staffMember.firstName ?? ''}`.trim() || null
      : null;
    return {
      id: a.id,
      staffMemberId: a.staffMemberId,
      staffName,
      action: a.action,
      recordedAt: a.recordedAt,
      latitude: this.toNumber(a.latitude),
      longitude: this.toNumber(a.longitude),
      geofenceId: a.geofenceId ?? null,
      geofenceName: a.geofence?.name ?? null,
      deviceInfo: a.deviceInfo ?? null,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }
}
