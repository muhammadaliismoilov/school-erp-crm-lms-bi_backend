import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, IsNull, MoreThanOrEqual, Repository, SelectQueryBuilder } from "typeorm";
import type { LocalizedText } from "../../common/i18n/locale";
import { AuditService } from "../audit/audit.service";
import { User } from "../identity/entities/user.entity";
import { EnrollStudentDto } from "../students/dto/enroll-student.dto";
import { StudentsService } from "../students/students.service";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { CreateLeadCommentDto, LeadCommentResponseDto, UpdateLeadCommentDto } from "./dto/lead-comment.dto";
import { CreateLeadTagDto, LeadTagResponseDto, UpdateLeadTagDto } from "./dto/lead-tag.dto";
import { EnrollLeadResultDto } from "./dto/enroll-lead.dto";
import { LeadQueryDto } from "./dto/lead-query.dto";
import { MoveLeadDto } from "./dto/move-lead.dto";
import {
  LeadListResultDto,
  LeadResponseDto,
  LeadStatsDto,
  SourceResponseDto,
} from "./dto/lead-response.dto";
import { CreateSourceDto } from "./dto/create-source.dto";
import { LeadHistoryEntryDto } from "./dto/lead-history.dto";
import { UpdateSourceDto } from "./dto/update-source.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { Lead } from "./entities/lead.entity";
import { LeadComment } from "./entities/lead-comment.entity";
import { LeadSource } from "./entities/lead-source.entity";
import { LeadTag } from "./entities/lead-tag.entity";
import { LeadStatus } from "./enums/lead-status.enum";
import { LeadTaskFilter } from "./enums/lead-task-filter.enum";

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
    @InjectRepository(LeadComment)
    private readonly comments: Repository<LeadComment>,
    @InjectRepository(LeadTag)
    private readonly tags: Repository<LeadTag>,
    private readonly studentsService: StudentsService,
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
        .leftJoinAndSelect("lead.tags", "tags")
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

  /**
   * Apply the shared lead filters (search/source/assignee/date/tags/task) to a
   * query builder. Tag and task filters use sub-queries (no JOINs) so the same
   * builder stays valid for the GROUP BY stats aggregate.
   */
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
    if (query.dateFrom) {
      qb.andWhere("lead.created_at >= :dateFrom", { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere("lead.created_at <= :dateTo", { dateTo: query.dateTo });
    }
    if (query.tagIds?.length) {
      qb.andWhere(
        "lead.id IN (SELECT link.lead_id FROM lead_tag_links link WHERE link.tag_id IN (:...tagIds))",
        { tagIds: query.tagIds },
      );
    }
    if (query.taskFilter) {
      const openTask =
        "SELECT 1 FROM lead_tasks lt WHERE lt.lead_id = lead.id AND lt.deleted_at IS NULL";
      if (query.taskFilter === LeadTaskFilter.HAS_OPEN) {
        qb.andWhere(`EXISTS (${openTask} AND lt.status = 'open')`);
      } else if (query.taskFilter === LeadTaskFilter.OVERDUE) {
        qb.andWhere(`EXISTS (${openTask} AND lt.status = 'open' AND lt.due_at < NOW())`);
      } else if (query.taskFilter === LeadTaskFilter.NONE) {
        qb.andWhere(`NOT EXISTS (${openTask})`);
      }
    }

    return qb;
  }

  async findLead(id: string): Promise<LeadResponseDto> {
    const lead = await this.findLeadEntity(id);
    const [commentsCount, nextReminder] = await Promise.all([
      this.comments.count({ where: { leadId: id } }),
      this.comments.findOne({
        where: { leadId: id, reminderDoneAt: IsNull(), remindAt: MoreThanOrEqual(new Date()) },
        order: { remindAt: "ASC" },
        select: { id: true, remindAt: true },
      }),
    ]);

    return {
      ...this.toLeadResponse(lead),
      commentsCount,
      nextReminderAt: nextReminder?.remindAt?.toISOString() ?? null,
    };
  }

  /** Lead activity timeline (newest first) built from the audit trail. */
  async findLeadHistory(id: string): Promise<LeadHistoryEntryDto[]> {
    await this.findLeadEntity(id);
    if (!this.auditService) {
      return [];
    }

    const logs = await this.auditService.findForEntity("lead", id);
    return logs
      .map((log) => ({
        id: log.id,
        action: log.action,
        actorName: log.user ? this.buildUserFullName(log.user) : null,
        timestamp: log.createdAt?.toISOString() ?? new Date().toISOString(),
        details: log.details ?? null,
      }))
      .reverse();
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

  async moveLead(id: string, dto: MoveLeadDto, actor?: CrmActor): Promise<LeadResponseDto> {
    const lead = await this.findLeadEntity(id);
    const statusFrom = lead.status;
    const statusChanged = lead.status !== dto.status;

    if (statusChanged) {
      lead.status = dto.status;
      await this.leads.save(lead);
      await this.audit(actor, "lead.status_changed", id, { status: dto.status });
    }

    // A note typed while moving the lead is attached to this transition so the
    // timeline reads "moved to X — <why>" instead of two disconnected events.
    if (dto.comment) {
      await this.createComment(
        id,
        { body: dto.comment, remindAt: dto.remindAt },
        actor,
        statusChanged ? { statusFrom, statusTo: dto.status } : null,
      );
    }

    return this.findLead(id);
  }

  async deleteLead(id: string, actor?: CrmActor): Promise<void> {
    const lead = await this.findLeadEntity(id);
    await this.leads.softDelete(id);
    await this.audit(actor, "lead.deleted", id, { phone: lead.phone });
  }

  // ------------------------------------------------------------- Comments

  /** Notes on a lead, pinned first then newest, with the author loaded. */
  async findComments(leadId: string): Promise<LeadCommentResponseDto[]> {
    await this.findLeadEntity(leadId);
    const comments = await this.comments.find({
      where: { leadId },
      relations: { author: true },
      order: { isPinned: "DESC", createdAt: "DESC" },
    });

    return comments.map((comment) => this.toCommentResponse(comment));
  }

  async addComment(
    leadId: string,
    dto: CreateLeadCommentDto,
    actor?: CrmActor,
  ): Promise<LeadCommentResponseDto> {
    await this.findLeadEntity(leadId);
    return this.toCommentResponse(await this.createComment(leadId, dto, actor));
  }

  async updateComment(
    leadId: string,
    commentId: string,
    dto: UpdateLeadCommentDto,
    actor?: CrmActor,
  ): Promise<LeadCommentResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        message: {
          uz: "Kamida bitta izoh maydoni berilishi kerak",
          ru: "Необходимо указать хотя бы одно поле комментария",
          en: "At least one comment field must be provided",
        },
      });
    }

    const comment = await this.findCommentEntity(leadId, commentId);
    this.ensureCommentOwner(comment, actor);

    if (dto.body !== undefined) {
      comment.body = dto.body;
    }
    if (dto.remindAt !== undefined) {
      comment.remindAt = dto.remindAt ? new Date(dto.remindAt) : null;
      // A fresh reminder re-opens the follow-up.
      comment.reminderDoneAt = dto.remindAt ? null : comment.reminderDoneAt;
    }
    if (dto.reminderDone !== undefined) {
      comment.reminderDoneAt = dto.reminderDone ? new Date() : null;
    }
    if (dto.isPinned !== undefined) {
      comment.isPinned = dto.isPinned;
    }

    const saved = await this.comments.save(comment);
    await this.audit(actor, "lead.comment_updated", leadId, {
      commentId,
      changed: Object.keys(dto),
    });

    return this.toCommentResponse(
      await this.findCommentEntity(leadId, saved.id),
    );
  }

  async deleteComment(leadId: string, commentId: string, actor?: CrmActor): Promise<void> {
    const comment = await this.findCommentEntity(leadId, commentId);
    this.ensureCommentOwner(comment, actor);

    await this.comments.softDelete(commentId);
    await this.audit(actor, "lead.comment_deleted", leadId, { commentId });
  }

  /** Persist a comment and write the matching audit entry (shared by add/move). */
  private async createComment(
    leadId: string,
    dto: CreateLeadCommentDto,
    actor?: CrmActor,
    context: Record<string, unknown> | null = null,
  ): Promise<LeadComment> {
    const comment = await this.comments.save(
      this.comments.create({
        leadId,
        authorId: actor?.userId ?? null,
        body: dto.body,
        remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
        isPinned: dto.isPinned ?? false,
        context,
      }),
    );

    await this.audit(actor, "lead.comment_added", leadId, {
      commentId: comment.id,
      body: comment.body,
      ...(comment.remindAt ? { remindAt: comment.remindAt.toISOString() } : {}),
      ...(context ?? {}),
    });

    return this.findCommentEntity(leadId, comment.id);
  }

  private async findCommentEntity(leadId: string, commentId: string): Promise<LeadComment> {
    const comment = await this.comments.findOne({
      where: { id: commentId, leadId },
      relations: { author: true },
    });
    if (!comment) {
      throw new NotFoundException("Lead comment not found");
    }

    return comment;
  }

  /** Only the author may edit or delete their own note. */
  private ensureCommentOwner(comment: LeadComment, actor?: CrmActor): void {
    if (!actor?.userId || comment.authorId !== actor.userId) {
      throw new ForbiddenException({
        message: {
          uz: "Bu izohni faqat muallifi tahrirlay yoki o'chira oladi",
          ru: "Этот комментарий может изменить или удалить только его автор",
          en: "Only the author can edit or delete this comment",
        },
      });
    }
  }

  private toCommentResponse(comment: LeadComment): LeadCommentResponseDto {
    return {
      id: comment.id,
      body: comment.body,
      author: comment.author
        ? { id: comment.author.id, fullName: this.buildUserFullName(comment.author) }
        : null,
      remindAt: comment.remindAt?.toISOString() ?? null,
      reminderDone: comment.reminderDoneAt != null,
      isPinned: comment.isPinned,
      context: comment.context ?? null,
      createdAt: comment.createdAt?.toISOString(),
      updatedAt: comment.updatedAt?.toISOString(),
    };
  }

  // ----------------------------------------------------------------- Tags

  async findTags(): Promise<LeadTagResponseDto[]> {
    const tags = await this.tags.find({ order: { name: "ASC" } });
    const counts = await this.countLeadsByTag();
    return tags.map((tag) => this.toTagResponse(tag, counts.get(tag.id) ?? 0));
  }

  async createTag(dto: CreateLeadTagDto, actor?: CrmActor): Promise<LeadTagResponseDto> {
    await this.ensureTagNameFree(dto.name);
    const tag = await this.tags.save(this.tags.create({ name: dto.name, color: dto.color ?? null }));
    await this.audit(actor, "lead_tag.created", tag.id, { name: tag.name }, "lead_tag");
    return this.toTagResponse(tag, 0);
  }

  async updateTag(id: string, dto: UpdateLeadTagDto, actor?: CrmActor): Promise<LeadTagResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        message: {
          uz: "Kamida bitta teg maydoni berilishi kerak",
          ru: "Необходимо указать хотя бы одно поле тега",
          en: "At least one tag field must be provided",
        },
      });
    }

    const tag = await this.findTagEntity(id);
    if (dto.name !== undefined && dto.name !== tag.name) {
      await this.ensureTagNameFree(dto.name, id);
      tag.name = dto.name;
    }
    if (dto.color !== undefined) {
      tag.color = dto.color;
    }

    const saved = await this.tags.save(tag);
    await this.audit(actor, "lead_tag.updated", id, { changed: Object.keys(dto) }, "lead_tag");

    const counts = await this.countLeadsByTag();
    return this.toTagResponse(saved, counts.get(id) ?? 0);
  }

  async deleteTag(id: string, actor?: CrmActor): Promise<void> {
    const tag = await this.findTagEntity(id);
    // The join's tag_id FK is ON DELETE NO ACTION, so detach the links first.
    await this.tags.manager
      .createQueryBuilder()
      .delete()
      .from("lead_tag_links")
      .where("tag_id = :id", { id })
      .execute();
    await this.tags.delete(id);
    await this.audit(actor, "lead_tag.deleted", id, { name: tag.name }, "lead_tag");
  }

  /** Replace the full tag set of a lead. */
  async setLeadTags(leadId: string, tagIds: string[], actor?: CrmActor): Promise<LeadResponseDto> {
    const lead = await this.findLeadEntity(leadId);
    const unique = [...new Set(tagIds)];
    const tags = unique.length ? await this.tags.findBy({ id: In(unique) }) : [];
    if (tags.length !== unique.length) {
      throw new NotFoundException("One or more tags not found");
    }

    lead.tags = tags;
    await this.leads.save(lead);
    await this.audit(actor, "lead.tags_changed", leadId, { tagIds: unique });

    return this.findLead(leadId);
  }

  private async countLeadsByTag(): Promise<Map<string, number>> {
    const rows = await this.tags
      .createQueryBuilder("tag")
      .leftJoin("lead_tag_links", "link", "link.tag_id = tag.id")
      .select("tag.id", "tagId")
      .addSelect("COUNT(link.lead_id)", "count")
      .groupBy("tag.id")
      .getRawMany<{ tagId: string; count: string }>();

    return new Map(rows.map((row) => [row.tagId, Number(row.count)]));
  }

  private async findTagEntity(id: string): Promise<LeadTag> {
    const tag = await this.tags.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException("Lead tag not found");
    }

    return tag;
  }

  private async ensureTagNameFree(name: string, excludeId?: string): Promise<void> {
    const existing = await this.tags.findOne({ where: { name } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        message: {
          uz: "Bunday nomli teg allaqachon mavjud",
          ru: "Тег с таким названием уже существует",
          en: "A tag with this name already exists",
        },
      });
    }
  }

  // ------------------------------------------------------------ Enrollment

  /**
   * Convert a successful (contract) lead into an enrolled student. Only leads
   * in the `contract` stage are eligible, and a lead can be enrolled once.
   */
  async enrollLead(
    leadId: string,
    dto: EnrollStudentDto,
    actor?: CrmActor,
  ): Promise<EnrollLeadResultDto> {
    const lead = await this.findLeadEntity(leadId);

    if (lead.status !== LeadStatus.CONTRACT) {
      throw new BadRequestException({
        message: {
          uz: "Faqat 'Shartnoma' bosqichidagi lidni o'quvchiga aylantirish mumkin",
          ru: "В студента можно конвертировать только лид на этапе 'Договор'",
          en: "Only a lead in the 'contract' stage can be enrolled as a student",
        },
      });
    }
    if (lead.enrolledStudentId) {
      throw new ConflictException({
        message: {
          uz: "Bu lid allaqachon o'quvchiga aylantirilgan",
          ru: "Этот лид уже конвертирован в студента",
          en: "This lead has already been enrolled as a student",
        },
      });
    }

    const student = await this.studentsService.enrollStudent(dto, leadId);

    lead.enrolledStudentId = student.id;
    await this.leads.save(lead);
    await this.audit(actor, "lead.enrolled", leadId, {
      studentId: student.id,
      studentCode: student.studentCode,
    });

    return {
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: [student.lastName, student.firstName].filter(Boolean).join(" ").trim(),
      leadId,
    };
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
      relations: { source: true, assignedTo: true, tags: true },
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
      enrolledStudentId: lead.enrolledStudentId ?? null,
      tags: (lead.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color ?? null })),
      createdAt: lead.createdAt?.toISOString(),
      updatedAt: lead.updatedAt?.toISOString(),
    };
  }

  private toTagResponse(tag: LeadTag, leadCount?: number): LeadTagResponseDto {
    return { id: tag.id, name: tag.name, color: tag.color ?? null, ...(leadCount !== undefined ? { leadCount } : {}) };
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
