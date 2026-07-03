import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AcademicYear } from '../academic/entities/academic-year.entity';
import { AuditService } from '../audit/audit.service';
import { Student } from '../students/entities/student.entity';
import {
  comparePlans,
  DiscountType,
  PlanCode,
  PLAN_ORDER,
  PlanComparisonRow,
  PlanConfig,
  validatePlanRates,
} from './billing.util';
import { PaymentPlanConfig } from './entities/payment-plan-config.entity';
import { PaymentPlanRate } from './entities/payment-plan-rate.entity';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';

export interface PlanActor {
  userId?: string;
  username?: string;
  ipAddress?: string;
}

export interface PlanRateInput {
  planCode: PlanCode;
  discountType: DiscountType;
  discountValue: number;
}

export interface UpdatePlanConfigInput {
  referenceMonthlyFee: number;
  fallbackMonths: number;
  rates: PlanRateInput[];
}

export interface AcademicWindow {
  start: string;
  end: string;
  months: number;
  /** Joriy akademik yil topilganmi (false → fallback oynasi). */
  resolved: boolean;
}

export interface PlanConfigResponse {
  id: string;
  referenceMonthlyFee: number;
  fallbackMonths: number;
  rates: PlanRateInput[];
  academic: AcademicWindow;
}

export interface PlanPreviewResponse {
  academic: AcademicWindow;
  plans: PlanComparisonRow[];
}

/**
 * To'lov rejasi chegirma konfiguratsiyasi + solishtiruv. Config maktab darajasida
 * (global). Invariant — chegirma(yearly_1x) > split_2 > split_3 > monthly —
 * saqlashda majburiy tekshiriladi. Solishtiruv `billing.util` orqali (UI bilan bir xil).
 */
@Injectable()
export class PaymentPlanService {
  private readonly logger = new Logger(PaymentPlanService.name);

  constructor(
    @InjectRepository(PaymentPlanConfig)
    private readonly configs: Repository<PaymentPlanConfig>,
    @InjectRepository(PaymentPlanRate)
    private readonly rates: Repository<PaymentPlanRate>,
    @InjectRepository(AcademicYear)
    private readonly academicYears: Repository<AcademicYear>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    private readonly auditService: AuditService,
    private readonly tenant: TenantContextService,
  ) {}

  /** Global config (yo'q bo'lsa standart yaratiladi). */
  async getConfig(): Promise<PlanConfigResponse> {
    const config = await this.resolveConfigEntity();
    const academic = await this.academicWindow();
    return this.toConfigResponse(config, academic);
  }

  /** Balans hisobi uchun yagona kontekst (config + akademik oyna) — bir marta yuklanadi. */
  async getContext(): Promise<{ config: PlanConfig; academic: AcademicWindow }> {
    const entity = await this.resolveConfigEntity();
    const academic = await this.academicWindow();
    return { config: this.toUtilConfig(entity.referenceMonthlyFee, this.toRateInputs(entity)), academic };
  }

  async updateConfig(input: UpdatePlanConfigInput, actor?: PlanActor): Promise<PlanConfigResponse> {
    const planConfig = this.toUtilConfig(input.referenceMonthlyFee, input.rates);
    const validation = validatePlanRates(planConfig);
    if (!validation.ok) {
      throw new BadRequestException(
        `Chegirma tartibi noto'g'ri — yillik 1 martalik chegirma eng katta, oyma-oy eng kichik bo'lishi shart. (${validation.violations.join('; ')})`,
      );
    }

    const config = await this.resolveConfigEntity();
    config.referenceMonthlyFee = input.referenceMonthlyFee;
    config.fallbackMonths = input.fallbackMonths;
    config.updatedBy = actor?.userId ?? null;
    config.updatedByName = actor?.username ?? null;
    await this.configs.save(config);

    // Rate'larni upsert qilamiz (har reja uchun bitta qator).
    const byCode = new Map(config.rates?.map((r) => [r.planCode, r]) ?? []);
    for (const code of PLAN_ORDER) {
      const incoming = input.rates.find((r) => r.planCode === code);
      if (!incoming) continue;
      const existing = byCode.get(code);
      if (existing) {
        existing.discountType = incoming.discountType;
        existing.discountValue = incoming.discountValue;
        await this.rates.save(existing);
      } else {
        await this.rates.save(this.rates.create({ configId: config.id, ...incoming }));
      }
    }

    await this.recordAudit(actor, 'payment_plan_config.updated', config.id, {
      referenceMonthlyFee: input.referenceMonthlyFee,
      rates: input.rates,
    });

    const fresh = await this.resolveConfigEntity();
    return this.toConfigResponse(fresh, await this.academicWindow());
  }

  /**
   * Berilgan tarif/chegirma uchun 4 rejani solishtirish (FE jonli preview).
   * Gibrid: `override` berilsa (forma'da o'quvchiga maxsus reja chegirmasi
   * kiritilganda) faqat `overridePlan` rejasi chegirmasi global config ustidan
   * almashtiriladi — qolganlari global'dan qoladi.
   */
  async preview(
    monthlyFee: number,
    discountType: DiscountType = 'percent',
    discountValue = 0,
    billingStart?: string,
    override?: { planCode: PlanCode; discountType: DiscountType; discountValue: number },
  ): Promise<PlanPreviewResponse> {
    const config = await this.resolveConfigEntity();
    const academic = await this.academicWindow();

    let rates = this.toRateInputs(config);
    if (override) {
      rates = rates.map((r) =>
        r.planCode === override.planCode
          ? { ...r, discountType: override.discountType, discountValue: override.discountValue }
          : r,
      );
    }

    const plans = comparePlans(
      {
        monthlyFee,
        discountType,
        discountValue,
        billingStart: billingStart ?? academic.start,
        academicStart: academic.start,
        academicEnd: academic.end,
      },
      this.toUtilConfig(config.referenceMonthlyFee, rates),
    );
    return { academic, plans };
  }

  /** Bitta o'quvchi uchun rejalar solishtiruvi (per-student override hisobga olinadi). */
  async compareForStudent(studentId: string): Promise<PlanPreviewResponse | null> {
    const student = await this.students.findOne({ where: tenantWhere<Student>(this.tenant, { id: studentId }, { branch: true }) });
    if (!student) return null;
    const config = await this.resolveConfigEntity();
    const academic = await this.academicWindow();

    // Per-student override → faqat o'sha reja chegirmasini almashtiramiz.
    let rates = this.toRateInputs(config);
    if (student.planDiscountOverrideType && student.planDiscountOverrideValue != null && student.paymentPlan) {
      rates = rates.map((r) =>
        r.planCode === student.paymentPlan
          ? { ...r, discountType: student.planDiscountOverrideType as DiscountType, discountValue: Number(student.planDiscountOverrideValue) }
          : r,
      );
    }

    const plans = comparePlans(
      {
        monthlyFee: Number(student.monthlyFee) || 0,
        discountType: (student.discountType ?? 'percent') as DiscountType,
        discountValue: Number(student.discountValue) || 0,
        billingStart: student.billingStartDate ?? student.createdAt,
        academicStart: academic.start,
        academicEnd: academic.end,
      },
      this.toUtilConfig(config.referenceMonthlyFee, rates),
    );
    return { academic, plans };
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────────

  private async resolveConfigEntity(): Promise<PaymentPlanConfig> {
    let config = await this.configs.findOne({
      where: { academicYearId: IsNull() },
      relations: { rates: true },
    });
    if (!config) {
      config = await this.configs.save(
        this.configs.create({
          referenceMonthlyFee: 1000000,
          fallbackMonths: 10,
          rates: PLAN_ORDER.map((planCode) =>
            this.rates.create({ planCode, discountType: 'percent', discountValue: this.defaultDiscount(planCode) }),
          ),
        }),
      );
    }
    return config;
  }

  private defaultDiscount(code: PlanCode): number {
    // Foiz: yillik umumiy summadan (1 yillik 10%, 2 bo'lib 7%, 3 bo'lib 4%, oy 0%).
    return { yearly_1x: 10, split_2: 7, split_3: 4, monthly: 0 }[code];
  }

  private toRateInputs(config: PaymentPlanConfig): PlanRateInput[] {
    const byCode = new Map((config.rates ?? []).map((r) => [r.planCode, r]));
    return PLAN_ORDER.map((planCode) => {
      const r = byCode.get(planCode);
      return {
        planCode,
        discountType: (r?.discountType ?? 'percent') as DiscountType,
        discountValue: Number(r?.discountValue) || 0,
      };
    });
  }

  private toUtilConfig(referenceMonthlyFee: number, rates: PlanRateInput[]): PlanConfig {
    return { referenceMonthlyFee: Number(referenceMonthlyFee) || 0, rates };
  }

  private toConfigResponse(config: PaymentPlanConfig, academic: AcademicWindow): PlanConfigResponse {
    return {
      id: config.id,
      referenceMonthlyFee: Number(config.referenceMonthlyFee) || 0,
      fallbackMonths: config.fallbackMonths,
      rates: this.toRateInputs(config),
      academic,
    };
  }

  /** Joriy akademik yil oynasi; topilmasa fallbackMonths bilan oyna quriladi. */
  private async academicWindow(): Promise<AcademicWindow> {
    const current = await this.academicYears.findOne({ where: tenantWhere<AcademicYear>(this.tenant, { isCurrent: true }, { branch: true }) });
    if (current?.startDate && current?.endDate) {
      return {
        start: current.startDate,
        end: current.endDate,
        months: this.spanMonths(current.startDate, current.endDate),
        resolved: true,
      };
    }
    // Fallback: o'zbek maktab yili sentabrdan boshlanadi.
    const config = await this.configs.findOne({ where: tenantWhere<PaymentPlanConfig>(this.tenant, { academicYearId: IsNull() }, { branch: true }) });
    const months = config?.fallbackMonths ?? 10;
    const now = new Date();
    const startYear = now.getUTCMonth() + 1 >= 9 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    const start = `${startYear}-09-01`;
    const end = new Date(Date.UTC(startYear, 8 + months, 0)).toISOString().slice(0, 10);
    return { start, end, months, resolved: false };
  }

  private spanMonths(start: string, end: string): number {
    const s = new Date(`${start.slice(0, 10)}T00:00:00Z`);
    const e = new Date(`${end.slice(0, 10)}T00:00:00Z`);
    return Math.max((e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1, 0);
  }

  private async recordAudit(
    actor: PlanActor | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService.log({
        userId: actor?.userId,
        action,
        entity: 'payment_plan_config',
        entityId,
        ipAddress: actor?.ipAddress,
        details,
      });
    } catch (error) {
      this.logger.warn(`Failed to write payment plan audit log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
