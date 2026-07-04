import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import {
  CreatePayRateCardDto,
  PayRateCardQueryDto,
  UpdatePayRateCardDto,
  UpdatePayrollSettingsDto,
} from './dto/payroll-config.dto';
import { PayRateCard } from './entities/pay-rate-card.entity';
import { PayrollSettings } from './entities/payroll-settings.entity';
import { QualificationCategory } from './enums/hr.enums';

export interface PayRateCardResponse {
  id: string;
  category: QualificationCategory;
  ratePerLesson: number;
  effectiveFrom: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Sozlama mavjud bo'lmasa qaytariladigan standart qiymatlar (entity default'lari bilan mos). */
const SETTINGS_DEFAULTS = {
  classLeaderRate: 0,
  maxClassLeaderships: 3,
};

export type PayrollSettingsResponse = typeof SETTINGS_DEFAULTS;

/**
 * Payroll konfiguratsiyasi: toifa stavkalari (tarixli) va oylik siyosati.
 * Dvigatel (6-bosqich) stavkani `resolveRate` orqali oladi — sana bo'yicha
 * eng so'nggi amaldagi yozuv tanlanadi.
 */
@Injectable()
export class PayrollConfigService {
  constructor(
    @InjectRepository(PayRateCard) private readonly rateCards: Repository<PayRateCard>,
    @InjectRepository(PayrollSettings) private readonly settings: Repository<PayrollSettings>,
    private readonly tenant: TenantContextService,
  ) {}

  // ─── Stavka jadvali ───────────────────────────────────────────────────────

  async findRateCards(query: PayRateCardQueryDto): Promise<PayRateCardResponse[]> {
    const qb = this.rateCards
      .createQueryBuilder('rc')
      .where('rc.deleted_at IS NULL')
      .orderBy('rc.category', 'ASC')
      .addOrderBy('rc.effective_from', 'DESC');
    applyTenantScope(qb, 'rc', this.tenant, { branch: true });
    if (query.category) qb.andWhere('rc.category = :cat', { cat: query.category });
    const items = await qb.getMany();
    return items.map((e) => this.toResponse(e));
  }

  async createRateCard(dto: CreatePayRateCardDto): Promise<PayRateCardResponse> {
    await this.assertNoDuplicate(dto.category, dto.effectiveFrom);
    const entity = await this.rateCards.save(
      this.rateCards.create({
        category: dto.category,
        ratePerLesson: dto.ratePerLesson,
        effectiveFrom: dto.effectiveFrom,
        note: dto.note ?? null,
      }),
    );
    return this.toResponse(entity);
  }

  async updateRateCard(id: string, dto: UpdatePayRateCardDto): Promise<PayRateCardResponse> {
    const entity = await this.getRateCard(id);
    const category = dto.category ?? entity.category;
    const effectiveFrom = dto.effectiveFrom ?? entity.effectiveFrom;
    if (category !== entity.category || effectiveFrom !== entity.effectiveFrom) {
      await this.assertNoDuplicate(category, effectiveFrom, id);
    }
    if (dto.category !== undefined) entity.category = dto.category;
    if (dto.ratePerLesson !== undefined) entity.ratePerLesson = dto.ratePerLesson;
    if (dto.effectiveFrom !== undefined) entity.effectiveFrom = dto.effectiveFrom;
    if (dto.note !== undefined) entity.note = dto.note ?? null;
    await this.rateCards.save(entity);
    return this.toResponse(entity);
  }

  async removeRateCard(id: string): Promise<void> {
    const entity = await this.getRateCard(id);
    await this.rateCards.softDelete(entity.id);
  }

  /**
   * Berilgan toifa uchun `onDate` sanasida amaldagi stavka (dvigatel uchun).
   * Topilmasa null — dvigatel bu holatda o'qituvchining shaxsiy stavkasiga
   * (Teacher.ratePerLesson) yoki 0 ga tayanadi.
   */
  async resolveRate(category: QualificationCategory, onDate: string): Promise<number | null> {
    const qb = this.rateCards
      .createQueryBuilder('rc')
      .where('rc.deleted_at IS NULL')
      .andWhere('rc.category = :cat', { cat: category })
      .andWhere('rc.effective_from <= :d', { d: onDate })
      .orderBy('rc.effective_from', 'DESC')
      .limit(1);
    applyTenantScope(qb, 'rc', this.tenant, { branch: true });
    const row = await qb.getOne();
    return row ? Number(row.ratePerLesson) : null;
  }

  // ─── Oylik siyosati sozlamalari ───────────────────────────────────────────

  /** Joriy filial sozlamasi yoki (yo'q bo'lsa) standart qiymatlar. */
  async currentSettings(): Promise<PayrollSettingsResponse> {
    const row = await this.settings.findOne({
      where: tenantWhere<PayrollSettings>(this.tenant, {}, { branch: true }),
    });
    if (!row) return { ...SETTINGS_DEFAULTS };
    return {
      classLeaderRate: Number(row.classLeaderRate),
      maxClassLeaderships: row.maxClassLeaderships,
    };
  }

  /** Upsert — mavjud bo'lsa yangilaydi, aks holda yaratadi (tenant subscriber to'ldiradi). */
  async updateSettings(dto: UpdatePayrollSettingsDto): Promise<PayrollSettingsResponse> {
    const row =
      (await this.settings.findOne({ where: tenantWhere<PayrollSettings>(this.tenant, {}, { branch: true }) })) ??
      this.settings.create({ ...SETTINGS_DEFAULTS });
    Object.assign(row, dto);
    await this.settings.save(row);
    return this.currentSettings();
  }

  // ─── Helperlar ────────────────────────────────────────────────────────────

  private async getRateCard(id: string): Promise<PayRateCard> {
    const entity = await this.rateCards.findOne({
      where: tenantWhere<PayRateCard>(this.tenant, { id }, { branch: true }),
    });
    if (!entity) throw new NotFoundException('Stavka yozuvi topilmadi');
    return entity;
  }

  /** Bitta toifa + sana juftligi takrorlanmasin (tarix chalkashmasligi uchun). */
  private async assertNoDuplicate(
    category: QualificationCategory,
    effectiveFrom: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.rateCards
      .createQueryBuilder('rc')
      .where('rc.deleted_at IS NULL')
      .andWhere('rc.category = :cat', { cat: category })
      .andWhere('rc.effective_from = :d', { d: effectiveFrom });
    applyTenantScope(qb, 'rc', this.tenant, { branch: true });
    if (excludeId) qb.andWhere('rc.id != :ex', { ex: excludeId });
    const exists = await qb.getCount();
    if (exists > 0) {
      throw new BadRequestException('Bu toifa uchun shu sanadan boshlanadigan stavka allaqachon mavjud');
    }
  }

  private toResponse(e: PayRateCard): PayRateCardResponse {
    return {
      id: e.id,
      category: e.category,
      ratePerLesson: Number(e.ratePerLesson),
      effectiveFrom: e.effectiveFrom,
      note: e.note ?? null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
