import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  CreateHrPaymentDto,
  HrPaymentQueryDto,
  UpdateHrPaymentDto,
  UpdateHrPaymentStatusDto,
} from './dto/hr-payment.dto';
import { HrPayment } from './entities/hr-payment.entity';
import { StaffMember } from './entities/staff-member.entity';
import { HrPaymentStatus } from './enums/hr.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface HrPaymentResponse {
  id: string;
  staffMemberId: string;
  staffName: string | null;
  amount: number;
  paymentDate: string | null;
  status: HrPaymentStatus;
  timesheetId: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HrPaymentListResult {
  items: HrPaymentResponse[];
  meta: PageMeta;
}

@Injectable()
export class HrPaymentService {
  constructor(
    @InjectRepository(HrPayment) private readonly payments: Repository<HrPayment>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    private readonly tenant: TenantContextService,
  ) {}

  async findPayments(query: HrPaymentQueryDto): Promise<HrPaymentListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.payments
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.staffMember', 'staff')
      .where('p.deleted_at IS NULL');
    applyTenantScope(qb, 'p', this.tenant, { branch: true });

    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.staffMemberId) qb.andWhere('p.staff_member_id = :sid', { sid: query.staffMemberId });

    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('staff.first_name ILIKE :q', { q: `%${search}%` }).orWhere('staff.last_name ILIKE :q', {
            q: `%${search}%`,
          });
        }),
      );
    }

    const [items, total] = await qb
      .orderBy('p.paymentDate', 'DESC', 'NULLS LAST')
      .addOrderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((p) => this.toResponse(p)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
    };
  }

  async getPayment(id: string): Promise<HrPaymentResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async createPayment(dto: CreateHrPaymentDto): Promise<HrPaymentResponse> {
    await this.assertStaff(dto.staffMemberId);
    const entity = await this.payments.save(
      this.payments.create({
        staffMemberId: dto.staffMemberId,
        amount: dto.amount,
        paymentDate: dto.paymentDate ?? null,
        status: dto.status ?? HrPaymentStatus.PENDING,
        timesheetId: dto.timesheetId ?? null,
        note: this.nullableText(dto.note),
      }),
    );
    return this.getPayment(entity.id);
  }

  async updatePayment(id: string, dto: UpdateHrPaymentDto): Promise<HrPaymentResponse> {
    const entity = await this.findEntity(id);
    if (dto.staffMemberId !== undefined) {
      await this.assertStaff(dto.staffMemberId);
      entity.staffMemberId = dto.staffMemberId;
    }
    if (dto.amount !== undefined) entity.amount = dto.amount;
    if (dto.paymentDate !== undefined) entity.paymentDate = dto.paymentDate ?? null;
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.timesheetId !== undefined) entity.timesheetId = dto.timesheetId || null;
    if (dto.note !== undefined) entity.note = this.nullableText(dto.note);

    await this.payments.save(entity);
    return this.getPayment(entity.id);
  }

  async updateStatus(id: string, dto: UpdateHrPaymentStatusDto): Promise<HrPaymentResponse> {
    const entity = await this.findEntity(id);
    entity.status = dto.status;
    await this.payments.save(entity);
    return this.getPayment(entity.id);
  }

  async removePayment(id: string): Promise<void> {
    const entity = await this.findEntity(id);
    await this.payments.softDelete(entity.id);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<HrPayment> {
    const entity = await this.payments.findOne({ where: tenantWhere<HrPayment>(this.tenant, { id }, { branch: true }), relations: { staffMember: true } });
    if (!entity) throw new NotFoundException('To‘lov topilmadi');
    return entity;
  }

  private async assertStaff(staffMemberId: string): Promise<void> {
    const exists = await this.staff.findOne({ where: tenantWhere<StaffMember>(this.tenant, { id: staffMemberId }, { branch: true }) });
    if (!exists) throw new NotFoundException('Xodim topilmadi');
  }

  private toResponse(p: HrPayment): HrPaymentResponse {
    return {
      id: p.id,
      staffMemberId: p.staffMemberId,
      staffName: p.staffMember
        ? `${p.staffMember.lastName ?? ''} ${p.staffMember.firstName ?? ''}`.trim() || null
        : null,
      amount: Number(p.amount) || 0,
      paymentDate: p.paymentDate ?? null,
      status: p.status,
      timesheetId: p.timesheetId ?? null,
      note: p.note ?? null,
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
