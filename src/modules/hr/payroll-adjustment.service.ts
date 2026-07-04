import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import {
  CreatePayrollAdjustmentDto,
  PayrollAdjustmentQueryDto,
  UpdatePayrollAdjustmentDto,
} from './dto/payroll-adjustment.dto';
import { Payroll } from './entities/payroll.entity';
import { PayrollAdjustment } from './entities/payroll-adjustment.entity';
import { StaffMember } from './entities/staff-member.entity';
import { PayrollAdjustmentType, PayrollStatus } from './enums/hr.enums';

export interface PayrollAdjustmentResponse {
  id: string;
  staffMemberId: string;
  staffName: string | null;
  period: string;
  type: PayrollAdjustmentType;
  amount: number;
  reason: string;
  createdById: string | null;
  createdAt: Date;
}

/**
 * Qo'lda bonus/jarima yozuvlari. Muhim qoida: tegishli oylik (staff+period)
 * Qoralama'dan o'tib bo'lgan bo'lsa — yaratish/tahrirlash/o'chirish taqiqlanadi.
 * Tuzatish keyingi oyga RETRO_ADJUSTMENT sifatida kiritiladi (6-bosqich dvigateli).
 */
@Injectable()
export class PayrollAdjustmentService {
  constructor(
    @InjectRepository(PayrollAdjustment)
    private readonly adjustments: Repository<PayrollAdjustment>,
    @InjectRepository(Payroll) private readonly payrolls: Repository<Payroll>,
    @InjectRepository(StaffMember) private readonly staff: Repository<StaffMember>,
    private readonly tenant: TenantContextService,
  ) {}

  async find(query: PayrollAdjustmentQueryDto): Promise<PayrollAdjustmentResponse[]> {
    const qb = this.adjustments
      .createQueryBuilder('adj')
      .leftJoinAndSelect('adj.staffMember', 'sm')
      .where('adj.deleted_at IS NULL')
      .orderBy('adj.created_at', 'DESC');
    applyTenantScope(qb, 'adj', this.tenant, { branch: true });
    if (query.staffMemberId) qb.andWhere('adj.staff_member_id = :sid', { sid: query.staffMemberId });
    if (query.period) qb.andWhere('adj.period = :p', { p: query.period });
    if (query.type) qb.andWhere('adj.type = :t', { t: query.type });
    const items = await qb.getMany();
    return items.map((a) => this.toResponse(a));
  }

  async create(dto: CreatePayrollAdjustmentDto, actorUserId?: string): Promise<PayrollAdjustmentResponse> {
    const staff = await this.staff.findOne({
      where: tenantWhere<StaffMember>(this.tenant, { id: dto.staffMemberId }, { branch: true }),
    });
    if (!staff) throw new NotFoundException('Xodim topilmadi');
    await this.assertPeriodOpen(dto.staffMemberId, dto.period);

    const entity = await this.adjustments.save(
      this.adjustments.create({
        staffMemberId: dto.staffMemberId,
        period: dto.period,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason.trim(),
        createdById: actorUserId ?? null,
      }),
    );
    return this.toResponse(await this.getOne(entity.id));
  }

  async update(id: string, dto: UpdatePayrollAdjustmentDto): Promise<PayrollAdjustmentResponse> {
    const entity = await this.getOne(id);
    await this.assertPeriodOpen(entity.staffMemberId, entity.period);
    if (dto.amount !== undefined) entity.amount = dto.amount;
    if (dto.reason !== undefined) entity.reason = dto.reason.trim();
    await this.adjustments.save(entity);
    return this.toResponse(await this.getOne(id));
  }

  async remove(id: string): Promise<void> {
    const entity = await this.getOne(id);
    await this.assertPeriodOpen(entity.staffMemberId, entity.period);
    await this.adjustments.softDelete(entity.id);
  }

  // ─── Helperlar ────────────────────────────────────────────────────────────

  /** Oylik Qoralama'dan o'tgan davr uchun tuzatish kiritilmaydi (immutability). */
  private async assertPeriodOpen(staffMemberId: string, period: string): Promise<void> {
    const locked = await this.payrolls.findOne({
      where: tenantWhere<Payroll>(
        this.tenant,
        {
          staffMemberId,
          period,
          status: In([
            PayrollStatus.PENDING_APPROVAL,
            PayrollStatus.APPROVED,
            PayrollStatus.PAID,
            PayrollStatus.LOCKED,
          ]),
        },
        { branch: true },
      ),
    });
    if (locked) {
      throw new BadRequestException(
        'Bu davr oyligi allaqachon tasdiqlash jarayonida/yopilgan — tuzatish keyingi oyga kiritiladi',
      );
    }
  }

  private async getOne(id: string): Promise<PayrollAdjustment> {
    const entity = await this.adjustments.findOne({
      where: tenantWhere<PayrollAdjustment>(this.tenant, { id }, { branch: true }),
      relations: { staffMember: true },
    });
    if (!entity) throw new NotFoundException('Tuzatish yozuvi topilmadi');
    return entity;
  }

  private toResponse(a: PayrollAdjustment): PayrollAdjustmentResponse {
    const sm = a.staffMember;
    return {
      id: a.id,
      staffMemberId: a.staffMemberId,
      staffName: sm ? `${sm.lastName} ${sm.firstName}`.trim() : null,
      period: a.period,
      type: a.type,
      amount: Number(a.amount),
      reason: a.reason,
      createdById: a.createdById ?? null,
      createdAt: a.createdAt,
    };
  }
}
