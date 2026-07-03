import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomInt, randomBytes } from "crypto";
import { In, Repository, SelectQueryBuilder } from "typeorm";
import type { LocalizedText } from "../../common/i18n/locale";
import { AuditService } from "../audit/audit.service";
import { CrmActor } from "./crm.service";
import { CreateReferralDto } from "./dto/create-referral.dto";
import { PublicReferralLeadDto } from "./dto/public-referral-lead.dto";
import { ReferralQueryDto, ReferralStatusFilter } from "./dto/referral-query.dto";
import {
  PublicReferralInfoDto,
  ReferralListResultDto,
  ReferralResponseDto,
  ReferralStatsDto,
} from "./dto/referral-response.dto";
import { UpdateReferralDto } from "./dto/update-referral.dto";
import { Lead } from "./entities/lead.entity";
import { LeadSource } from "./entities/lead-source.entity";
import { Referral } from "./entities/referral.entity";
import { LeadStatus } from "./enums/lead-status.enum";
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referrals: Repository<Referral>,
    @InjectRepository(Lead)
    private readonly leads: Repository<Lead>,
    @InjectRepository(LeadSource)
    private readonly sources: Repository<LeadSource>,
    private readonly configService: ConfigService,
    private readonly tenant: TenantContextService,
    @Optional()
    private readonly auditService?: AuditService,
  ) {}

  // ------------------------------------------------------------- CRM (auth)

  async findReferrals(query: ReferralQueryDto): Promise<ReferralListResultDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const stats = await this.buildStats(query.search);

    const qb = this.applyFilters(
      this.referrals.createQueryBuilder("referral").leftJoinAndSelect("referral.source", "source"),
      query,
    ).orderBy("referral.createdAt", "DESC");

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const counts = await this.countLeadsByCode(items.map((r) => r.code));

    return {
      items: items.map((r) => this.toResponse(r, counts.get(r.code) ?? 0)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
      stats,
    };
  }

  async findReferral(id: string): Promise<ReferralResponseDto> {
    const referral = await this.findEntity(id);
    const counts = await this.countLeadsByCode([referral.code]);
    return this.toResponse(referral, counts.get(referral.code) ?? 0);
  }

  async createReferral(dto: CreateReferralDto, actor?: CrmActor): Promise<ReferralResponseDto> {
    if (dto.sourceId) {
      await this.ensureSourceExists(dto.sourceId);
    }

    const referral = await this.referrals.save(
      this.referrals.create({
        name: dto.name.trim(),
        code: await this.generateUniqueCode(),
        description: dto.description?.trim() ?? null,
        sourceId: dto.sourceId ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        template: dto.template ?? undefined,
        themeColor: dto.themeColor ?? null,
        isActive: true,
        createdById: actor?.userId ?? null,
      }),
    );

    await this.audit(actor, "referral.created", referral.id, { name: referral.name, code: referral.code });
    return this.toResponse(await this.findEntity(referral.id), 0);
  }

  async updateReferral(id: string, dto: UpdateReferralDto, actor?: CrmActor): Promise<ReferralResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        message: {
          uz: "Kamida bitta referal maydoni berilishi kerak",
          ru: "Необходимо указать хотя бы одно поле реферала",
          en: "At least one referral field must be provided",
        },
      });
    }

    const referral = await this.findEntity(id);
    if (dto.sourceId !== undefined && dto.sourceId) {
      await this.ensureSourceExists(dto.sourceId);
    }

    if (dto.name !== undefined) referral.name = dto.name.trim();
    if (dto.description !== undefined) referral.description = dto.description?.trim() ?? null;
    if (dto.sourceId !== undefined) referral.sourceId = dto.sourceId ?? null;
    if (dto.expiresAt !== undefined) referral.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.template !== undefined) referral.template = dto.template;
    if (dto.themeColor !== undefined) referral.themeColor = dto.themeColor ?? null;
    if (dto.isActive !== undefined) referral.isActive = dto.isActive;

    await this.referrals.save(referral);
    await this.audit(actor, "referral.updated", id, { changed: Object.keys(dto) });

    const counts = await this.countLeadsByCode([referral.code]);
    return this.toResponse(await this.findEntity(id), counts.get(referral.code) ?? 0);
  }

  async deleteReferral(id: string, actor?: CrmActor): Promise<void> {
    const referral = await this.findEntity(id);
    // Soft-delete: existing leads keep their referralCode for attribution history.
    await this.referrals.softDelete(id);
    await this.audit(actor, "referral.deleted", id, { code: referral.code });
  }

  // ---------------------------------------------------- Public (no auth)

  /** Validate a public referral code; throws 404 if missing, disabled or expired. */
  async validatePublicReferral(code: string): Promise<PublicReferralInfoDto> {
    const referral = await this.resolveActive(code);
    return {
      valid: true,
      name: referral.name,
      description: referral.description ?? null,
      template: referral.template,
      themeColor: referral.themeColor ?? null,
      sourceName: referral.source ? this.localizedName(referral.source.name, referral.source.code) : null,
    };
  }

  /** Create a lead from a public referral submission. Honeypot-guarded. */
  async submitPublicLead(code: string, dto: PublicReferralLeadDto): Promise<{ id: string }> {
    const referral = await this.resolveActive(code);

    // Honeypot tripped: pretend success so the bot doesn't retry, persist nothing.
    if (dto.website && dto.website.trim().length > 0) {
      this.logger.warn(`Discarded public referral lead (honeypot): code=${code}`);
      return { id: randomBytes(16).toString("hex") };
    }

    const lead = await this.leads.save(
      this.leads.create({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName?.trim() || null,
        phone: dto.phone,
        status: LeadStatus.NEW,
        sourceId: referral.sourceId ?? null,
        referralCode: referral.code,
      }),
    );

    await this.audit(undefined, "lead.referral_created", lead.id, { referralCode: referral.code });
    return { id: lead.id };
  }

  // --------------------------------------------------------------- Helpers

  private applyFilters(
    qb: SelectQueryBuilder<Referral>,
    query: ReferralQueryDto,
  ): SelectQueryBuilder<Referral> {
    if (query.search) {
      qb.andWhere("referral.name ILIKE :search", { search: `%${query.search}%` });
    }
    if (query.status === ReferralStatusFilter.ACTIVE) {
      qb.andWhere("referral.is_active = true").andWhere(
        "(referral.expires_at IS NULL OR referral.expires_at >= NOW())",
      );
    } else if (query.status === ReferralStatusFilter.EXPIRED) {
      qb.andWhere("(referral.is_active = false OR referral.expires_at < NOW())");
    }
    return qb;
  }

  private async buildStats(search?: string): Promise<ReferralStatsDto> {
    const base = (): SelectQueryBuilder<Referral> => {
      const qb = this.referrals.createQueryBuilder("referral");
      if (search) qb.andWhere("referral.name ILIKE :search", { search: `%${search}%` });
      return qb;
    };

    const [total, active, withSource] = await Promise.all([
      base().getCount(),
      base()
        .andWhere("referral.is_active = true")
        .andWhere("(referral.expires_at IS NULL OR referral.expires_at >= NOW())")
        .getCount(),
      base().andWhere("referral.source_id IS NOT NULL").getCount(),
    ]);

    return { total, active, expired: total - active, withSource };
  }

  private async countLeadsByCode(codes: string[]): Promise<Map<string, number>> {
    if (codes.length === 0) return new Map();
    const rows = await this.leads
      .createQueryBuilder("lead")
      .select("lead.referral_code", "code")
      .addSelect("COUNT(*)", "count")
      .where("lead.referral_code IN (:...codes)", { codes })
      .groupBy("lead.referral_code")
      .getRawMany<{ code: string; count: string }>();

    return new Map(rows.map((row) => [row.code, Number(row.count)]));
  }

  private async findEntity(id: string): Promise<Referral> {
    const referral = await this.referrals.findOne({ where: tenantWhere<Referral>(this.tenant, { id }, { branch: true }), relations: { source: true } });
    if (!referral) {
      throw new NotFoundException("Referral not found");
    }
    return referral;
  }

  private async resolveActive(code: string): Promise<Referral> {
    const referral = await this.referrals.findOne({ where: tenantWhere<Referral>(this.tenant, { code }, { branch: true }), relations: { source: true } });
    if (!referral || !referral.isActive || (referral.expiresAt && referral.expiresAt.getTime() < Date.now())) {
      throw new NotFoundException("Referral link is invalid, disabled or expired");
    }
    return referral;
  }

  private async ensureSourceExists(sourceId: string): Promise<void> {
    const exists = await this.sources.findOne({ where: tenantWhere<LeadSource>(this.tenant, { id: sourceId }, { branch: true }) });
    if (!exists) {
      throw new BadRequestException({
        message: {
          uz: "Tanlangan manba topilmadi",
          ru: "Выбранный источник не найден",
          en: "Selected source not found",
        },
      });
    }
  }

  /** 7-digit numeric code with a hex fallback; retried on the (rare) collision. */
  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = String(randomInt(1_000_000, 10_000_000));
      const taken = await this.referrals.findOne({ where: tenantWhere<Referral>(this.tenant, { code }, { branch: true }), withDeleted: true });
      if (!taken) return code;
    }
    return randomBytes(8).toString("hex");
  }

  private buildUrl(code: string): string {
    const base = (
      this.configService.get<string>("app.publicWebUrl") ??
      process.env.APP_PUBLIC_WEB_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, "");
    return `${base}/referral/${code}`;
  }

  private computeStatus(referral: Referral): "active" | "expired" {
    const expired = !referral.isActive || (referral.expiresAt != null && referral.expiresAt.getTime() < Date.now());
    return expired ? "expired" : "active";
  }

  private localizedName(name: LocalizedText | undefined, fallback: string): string {
    return name?.uz || name?.ru || name?.en || fallback;
  }

  private toResponse(referral: Referral, leadCount: number): ReferralResponseDto {
    return {
      id: referral.id,
      name: referral.name,
      code: referral.code,
      url: this.buildUrl(referral.code),
      description: referral.description ?? null,
      source: referral.source
        ? { id: referral.source.id, name: this.localizedName(referral.source.name, referral.source.code) }
        : null,
      expiresAt: referral.expiresAt?.toISOString() ?? null,
      template: referral.template,
      themeColor: referral.themeColor ?? null,
      isActive: referral.isActive,
      status: this.computeStatus(referral),
      leadCount,
      createdAt: referral.createdAt?.toISOString(),
    };
  }

  private async audit(
    actor: CrmActor | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService?.log({
        userId: actor?.userId,
        action,
        entity: "referral",
        entityId,
        ipAddress: actor?.ipAddress,
        details,
      });
    } catch (error) {
      this.logger.warn(`Failed to write referral audit log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
