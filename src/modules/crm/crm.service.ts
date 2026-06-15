import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository, SelectQueryBuilder } from "typeorm";
import type { LocalizedText } from "../../common/i18n/locale";
import { AuditService } from "../audit/audit.service";
import { User } from "../identity/entities/user.entity";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { LeadQueryDto } from "./dto/lead-query.dto";
import {
  LeadListResultDto,
  LeadResponseDto,
  LeadStatsDto,
  SourceResponseDto,
} from "./dto/lead-response.dto";
import { CreateSourceDto } from "./dto/create-source.dto";
import { UpdateSourceDto } from "./dto/update-source.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { Lead } from "./entities/lead.entity";
import { LeadSource } from "./entities/lead-source.entity";
import { LeadStatus } from "./enums/lead-status.enum";

/** Who performed the action — used for the CRM audit trail. */
export interface CrmActor {
  userId?: string;
  ipAddress?: string;
}

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leads: Repository<Lead>,
    @InjectRepository(LeadSource)
    private readonly sources: Repository<LeadSource>,
    @Optional()
    private readonly auditService?: AuditService,
  ) {}

  // ---------------------------------------------------------------- Leads

  async createLead(dto: CreateLeadDto, actor?: CrmActor): Promise<LeadResponseDto> {
    const lead = await this.leads.save(this.leads.create(dto));
    await this.audit(actor, "lead.created", lead.id, { phone: lead.phone });

    return this.toLeadResponse(await this.findLeadEntity(lead.id));
  }

  async findLeads(query: LeadQueryDto): Promise<LeadListResultDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Search / source / assignee narrow both the list and the kanban stats;
    // status only narrows the list (so every kanban column count stays visible).
    // Stats run on a dedicated builder (no joins / no ORDER BY) so the GROUP BY
    // aggregate is valid in Postgres.
    const stats = await this.buildLeadStats(
      this.applyLeadFilters(this.leads.createQueryBuilder("lead"), query),
    );

    const qb = this.applyLeadFilters(
      this.leads
        .createQueryBuilder("lead")
        .leftJoinAndSelect("lead.source", "source")
        .leftJoinAndSelect("lead.assignedTo", "assignedTo")
        .orderBy("lead.createdAt", "DESC"),
      query,
    );

    if (query.status) {
      qb.andWhere("lead.status = :status", { status: query.status });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((lead) => this.toLeadResponse(lead)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
      stats,
    };
  }

  /** Apply the shared lead filters (search/source/assignee) to a query builder. */
  private applyLeadFilters(qb: SelectQueryBuilder<Lead>, query: LeadQueryDto): SelectQueryBuilder<Lead> {
    if (query.search) {
      qb.andWhere(
        "(lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR lead.phone ILIKE :search)",
        { search: `%${query.search}%` },
      );
    }
    if (query.sourceId) {
      qb.andWhere("lead.source_id = :sourceId", { sourceId: query.sourceId });
    }
    if (query.assignedToId) {
      qb.andWhere("lead.assigned_to_id = :assignedToId", { assignedToId: query.assignedToId });
    }

    return qb;
  }

  async findLead(id: string): Promise<LeadResponseDto> {
    return this.toLeadResponse(await this.findLeadEntity(id));
  }

  async updateLead(id: string, dto: UpdateLeadDto, actor?: CrmActor): Promise<LeadResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        message: {
          uz: "Kamida bitta lid maydoni berilishi kerak",
          ru: "Необходимо указать хотя бы одно поле лида",
          en: "At least one lead field must be provided",
        },
      });
    }

    const lead = await this.findLeadEntity(id);
    const statusChanged = dto.status !== undefined && dto.status !== lead.status;
    Object.assign(lead, dto);
    const saved = await this.leads.save(lead);

    await this.audit(actor, statusChanged ? "lead.status_changed" : "lead.updated", id, {
      changed: Object.keys(dto),
      ...(statusChanged ? { status: dto.status } : {}),
    });

    return this.toLeadResponse(await this.findLeadEntity(saved.id));
  }

  async moveLead(id: string, status: LeadStatus, actor?: CrmActor): Promise<LeadResponseDto> {
    const lead = await this.findLeadEntity(id);
    if (lead.status !== status) {
      lead.status = status;
      await this.leads.save(lead);
      await this.audit(actor, "lead.status_changed", id, { status });
    }

    return this.toLeadResponse(await this.findLeadEntity(id));
  }

  async deleteLead(id: string, actor?: CrmActor): Promise<void> {
    const lead = await this.findLeadEntity(id);
    await this.leads.softDelete(id);
    await this.audit(actor, "lead.deleted", id, { phone: lead.phone });
  }

  // -------------------------------------------------------------- Sources

  async findSources(search?: string): Promise<SourceResponseDto[]> {
    const sources = await this.sources.find({
      ...(search ? { where: { code: ILike(`%${this.buildSourceCode(search)}%`) } } : {}),
      order: { createdAt: "ASC" },
    });

    const counts = await this.countLeadsBySource();
    return sources.map((source) => this.toSourceResponse(source, counts.get(source.id) ?? 0));
  }

  async createSource(dto: CreateSourceDto, actor?: CrmActor): Promise<SourceResponseDto> {
    const code = this.buildSourceCode(dto.name);
    await this.ensureSourceCodeFree(code);

    const source = await this.sources.save(
      this.sources.create({ name: this.toLocalized(dto.name), code, icon: dto.icon ?? null }),
    );
    await this.audit(actor, "lead_source.created", source.id, { code }, "lead_source");

    return this.toSourceResponse(source, 0);
  }

  async updateSource(id: string, dto: UpdateSourceDto, actor?: CrmActor): Promise<SourceResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        message: {
          uz: "Kamida bitta manba maydoni berilishi kerak",
          ru: "Необходимо указать хотя бы одно поле источника",
          en: "At least one source field must be provided",
        },
      });
    }

    const source = await this.findSourceEntity(id);
    if (dto.name !== undefined) {
      const code = this.buildSourceCode(dto.name);
      await this.ensureSourceCodeFree(code, id);
      source.name = this.toLocalized(dto.name);
      source.code = code;
    }
    if (dto.icon !== undefined) {
      source.icon = dto.icon;
    }

    const saved = await this.sources.save(source);
    await this.audit(actor, "lead_source.updated", id, { changed: Object.keys(dto) }, "lead_source");

    const counts = await this.countLeadsBySource();
    return this.toSourceResponse(saved, counts.get(id) ?? 0);
  }

  async deleteSource(id: string, actor?: CrmActor): Promise<void> {
    const source = await this.findSourceEntity(id);
    const used = await this.leads.count({ where: { sourceId: id } });
    if (used > 0) {
      throw new ConflictException({
        message: {
          uz: "Bu manba lidlarda ishlatilmoqda va o'chirib bo'lmaydi",
          ru: "Этот источник используется в лидах и не может быть удалён",
          en: "This source is used by leads and cannot be deleted",
        },
      });
    }

    await this.sources.delete(id);
    await this.audit(actor, "lead_source.deleted", id, { code: source.code }, "lead_source");
  }

  // --------------------------------------------------------------- Helpers

  private async buildLeadStats(qb: SelectQueryBuilder<Lead>): Promise<LeadStatsDto> {
    const rows = await qb
      .select("lead.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("lead.status")
      .getRawMany<{ status: LeadStatus; count: string }>();

    const stats: LeadStatsDto = {
      total: 0,
      new: 0,
      contacted: 0,
      interested: 0,
      trial_lesson: 0,
      contract: 0,
      rejected: 0,
    };

    for (const row of rows) {
      const count = Number(row.count);
      stats.total += count;
      if (row.status in stats) {
        stats[row.status] = count;
      }
    }

    return stats;
  }

  private async countLeadsBySource(): Promise<Map<string, number>> {
    const rows = await this.leads
      .createQueryBuilder("lead")
      .select("lead.source_id", "sourceId")
      .addSelect("COUNT(*)", "count")
      .where("lead.source_id IS NOT NULL")
      .groupBy("lead.source_id")
      .getRawMany<{ sourceId: string; count: string }>();

    return new Map(rows.map((row) => [row.sourceId, Number(row.count)]));
  }

  private async findLeadEntity(id: string): Promise<Lead> {
    const lead = await this.leads.findOne({
      where: { id },
      relations: { source: true, assignedTo: true },
    });
    if (!lead) {
      throw new NotFoundException("Lead not found");
    }

    return lead;
  }

  private async findSourceEntity(id: string): Promise<LeadSource> {
    const source = await this.sources.findOne({ where: { id } });
    if (!source) {
      throw new NotFoundException("Lead source not found");
    }

    return source;
  }

  private async ensureSourceCodeFree(code: string, excludeId?: string): Promise<void> {
    const existing = await this.sources.findOne({ where: { code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        message: {
          uz: "Bunday nomli manba allaqachon mavjud",
          ru: "Источник с таким названием уже существует",
          en: "A source with this name already exists",
        },
      });
    }
  }

  private toLeadResponse(lead: Lead): LeadResponseDto {
    return {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      fullName: [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim(),
      phone: lead.phone,
      email: lead.email,
      status: lead.status,
      source: lead.source ? { id: lead.source.id, name: this.localizedName(lead.source.name, lead.source.code) } : null,
      assignedTo: lead.assignedTo
        ? { id: lead.assignedTo.id, fullName: this.buildUserFullName(lead.assignedTo) }
        : null,
      notes: lead.notes,
      referralCode: lead.referralCode,
      createdAt: lead.createdAt?.toISOString(),
      updatedAt: lead.updatedAt?.toISOString(),
    };
  }

  private toSourceResponse(source: LeadSource, leadCount: number): SourceResponseDto {
    return {
      id: source.id,
      name: this.localizedName(source.name, source.code),
      code: source.code,
      icon: source.icon,
      leadCount,
      createdAt: source.createdAt?.toISOString(),
    };
  }

  private localizedName(name: LocalizedText | undefined, fallback: string): string {
    return name?.uz || name?.ru || name?.en || fallback;
  }

  private toLocalized(value: string): LocalizedText {
    return { uz: value, ru: value, en: value };
  }

  private buildUserFullName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username;
  }

  private buildSourceCode(name: string): string {
    const code = name
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase()
      .slice(0, 80);

    return code || "SOURCE";
  }

  private async audit(
    actor: CrmActor | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    entity = "lead",
  ): Promise<void> {
    try {
      await this.auditService?.log({
        userId: actor?.userId,
        action,
        entity,
        entityId,
        ipAddress: actor?.ipAddress,
        details,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write ${entity} audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
