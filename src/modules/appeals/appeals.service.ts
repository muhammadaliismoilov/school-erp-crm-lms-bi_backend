import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Between, Brackets, FindOptionsWhere, Repository } from 'typeorm';
import { AppPermission } from '../../common/constants/permissions';
import { CommonStatus } from '../../common/enums/common-status.enum';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AuditService } from '../audit/audit.service';
import { User } from '../identity/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/enums/notification-status.enum';
import { AssignAppealDto } from './dto/assign-appeal.dto';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { AppealPeriodFilter, AppealQueryDto } from './dto/appeal-query.dto';
import { PublicCreateAppealDto } from './dto/public-create-appeal.dto';
import { UpdateAppealDto } from './dto/update-appeal.dto';
import {
  Appeal,
  AppealSource,
  AppealStatus,
  AppealType,
} from './entities/appeal.entity';
import { AppealPublicLink } from './entities/appeal-public-link.entity';
import { AppealListResponseSchema, AppealResponseSchema } from './swagger/appeal-response.schema';
import {
  AppealPublicLinkSchema,
  PublicAppealLinkInfoSchema,
} from './swagger/appeal-public-link.schema';

/** Who performed the action — used for audit trail and resolution attribution. */
export interface AppealActor {
  userId?: string;
  ipAddress?: string;
}

/** Ro'yxatni ko'rayotgan foydalanuvchi va uning qamrovi. */
export interface AppealViewer {
  userId?: string | null;
  /**
   * `appeals.read` — maktabning BARCHA murojaatlari (rahbariyat). `false` bo'lsa
   * foydalanuvchi faqat o'ziga biriktirilganini ko'radi (`appeals.read-assigned`).
   */
  canReadAll: boolean;
}

/** Allowed status transitions. Reopening a terminal appeal returns it to in_progress. */
const ALLOWED_STATUS_TRANSITIONS: Record<AppealStatus, AppealStatus[]> = {
  [AppealStatus.PENDING]: [AppealStatus.IN_PROGRESS, AppealStatus.RESOLVED, AppealStatus.REJECTED],
  [AppealStatus.IN_PROGRESS]: [AppealStatus.RESOLVED, AppealStatus.REJECTED, AppealStatus.PENDING],
  [AppealStatus.RESOLVED]: [AppealStatus.IN_PROGRESS],
  [AppealStatus.REJECTED]: [AppealStatus.IN_PROGRESS],
};

const TERMINAL_STATUSES: readonly AppealStatus[] = [
  AppealStatus.RESOLVED,
  AppealStatus.REJECTED,
];

@Injectable()
export class AppealsService {
  private readonly logger = new Logger(AppealsService.name);

  constructor(
    @InjectRepository(Appeal)
    private readonly appealRepository: Repository<Appeal>,
    @InjectRepository(AppealPublicLink)
    private readonly publicLinkRepository: Repository<AppealPublicLink>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly tenant: TenantContextService,
  ) {}

  // ---- Public link management (authed) ----

  async getPublicLink(): Promise<AppealPublicLinkSchema> {
    this.assertSchoolContext();
    const link = await this.publicLinkRepository.findOne({
      where: tenantWhere<AppealPublicLink>(this.tenant, { isActive: true }),
      order: { createdAt: 'DESC' },
    });
    if (!link) {
      return { token: null, url: null, active: false };
    }
    return { token: link.token, url: this.buildPublicUrl(link.token), active: true };
  }

  /** Rotates the active link: deactivates any existing one and issues a fresh token. */
  async createPublicLink(createdById?: string): Promise<AppealPublicLinkSchema> {
    this.assertSchoolContext();
    await this.publicLinkRepository.update(tenantWhere<AppealPublicLink>(this.tenant, { isActive: true }), { isActive: false });
    const token = randomBytes(16).toString('hex');
    const link = await this.publicLinkRepository.save(
      this.publicLinkRepository.create({ token, isActive: true, createdById: createdById ?? null }),
    );
    return { token: link.token, url: this.buildPublicUrl(link.token), active: true };
  }

  // ---- Public (unauthenticated) submission ----

  async validatePublicToken(token: string): Promise<PublicAppealLinkInfoSchema> {
    await this.resolveActiveLink(token);
    return { valid: true, title: 'Maktab murojaatlari' };
  }

  async createPublicAppeal(token: string, dto: PublicCreateAppealDto): Promise<{ id: string }> {
    const link = await this.resolveActiveLink(token);
    // Public route auth'siz ishlaydi, ya'ni `TenantScopeInterceptor` chetlab o'tiladi va
    // kontekst bo'sh qoladi — murojaat ham, undan tug'iladigan xabarlar ham egasiz
    // tushardi. Turniket ingestion'idagi naqsh: tenantni so'rovni autentifikatsiya
    // qilgan artefaktdan olamiz (u yerda qurilma, bu yerda havola).
    this.tenant.set({ schoolId: link.schoolId ?? null, branchId: link.filialId ?? null });

    // Honeypot tripped: a bot filled the hidden field. Pretend success (so the bot
    // doesn't retry) but persist nothing.
    if (dto.website && dto.website.trim().length > 0) {
      this.logger.warn('Discarded public appeal: honeypot field was filled');
      return { id: randomBytes(16).toString('hex') };
    }

    const appeal = await this.appealRepository.save(
      this.appealRepository.create({
        fullName: this.normalizeText(dto.fullName),
        phone: this.normalizePhone(dto.phone),
        type: dto.type,
        targetRole: dto.targetRole,
        description: this.normalizeText(dto.description),
        source: AppealSource.PUBLIC_LINK,
        status: AppealStatus.PENDING,
      }),
    );
    await this.recordAudit(undefined, 'appeal.public_created', appeal.id, {
      type: appeal.type,
      targetRole: appeal.targetRole,
    });
    await this.notifyAppealHandlers(appeal);
    return { id: appeal.id };
  }

  /**
   * Havola HAR DOIM bitta maktabga tegishli. Global hisob (CEO) «Barcha maktablar»
   * holatida turganda kontekst bo'sh bo'ladi: o'qishda tasodifiy maktabning havolasi
   * qaytardi, yaratishda esa hech bir maktabga tegishli bo'lmagan havola tug'ilardi.
   */
  private assertSchoolContext(): void {
    if (!this.tenant.getSchoolId()) {
      throw new BadRequestException({
        message: {
          uz: 'Havola bilan ishlash uchun avval maktabni tanlang',
          ru: 'Чтобы работать со ссылкой, сначала выберите школу',
          en: 'Select a school before working with the public link',
        },
      });
    }
  }

  private async resolveActiveLink(token: string): Promise<AppealPublicLink> {
    const link = await this.publicLinkRepository.findOne({ where: { token, isActive: true } });
    if (!link) {
      throw new NotFoundException('Public appeal link is invalid or inactive');
    }
    return link;
  }

  private buildPublicUrl(token: string): string {
    const base = (
      this.configService.get<string>('app.publicWebUrl') ??
      process.env.APP_PUBLIC_WEB_URL ??
      'http://localhost:3001'
    ).replace(/\/$/, '');
    return `${base}/p/appeals/${token}`;
  }

  async create(dto: CreateAppealDto, actor?: AppealActor): Promise<AppealResponseSchema> {
    const appeal = await this.appealRepository.save(
      this.appealRepository.create({
        fullName: this.normalizeText(dto.fullName),
        phone: this.normalizePhone(dto.phone),
        type: dto.type,
        targetRole: dto.targetRole,
        description: this.normalizeText(dto.description),
        source: dto.source ?? AppealSource.MANUAL,
        status: dto.status ?? AppealStatus.PENDING,
      }),
    );

    await this.recordAudit(actor?.userId, 'appeal.created', appeal.id, {
      type: appeal.type,
      targetRole: appeal.targetRole,
      source: appeal.source,
    }, actor?.ipAddress);
    await this.notifyAppealHandlers(appeal);

    return this.toResponseDto(appeal);
  }

  async findAll(
    query: Partial<AppealQueryDto> = {},
    viewer?: AppealViewer,
  ): Promise<AppealListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const assigneeOnly = this.resolveAssigneeFilter(viewer);
    const qb = this.appealRepository.createQueryBuilder('appeal').where('1 = 1');
    applyTenantScope(qb, 'appeal', this.tenant, { branch: true });
    if (assigneeOnly) {
      qb.andWhere('appeal.assignee_user_id = :assigneeOnly', { assigneeOnly });
    }
    const search = this.nullableText(query.search);

    if (search) {
      qb.andWhere(
        new Brackets((whereQb) => {
          whereQb
            .where('appeal.full_name ILIKE :search', { search: '%' + search + '%' })
            .orWhere('appeal.phone ILIKE :search', { search: '%' + search + '%' })
            .orWhere('appeal.description ILIKE :search', { search: '%' + search + '%' });
        }),
      );
    }

    if (query.type) {
      qb.andWhere('appeal.type = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('appeal.status = :status', { status: query.status });
    }

    if (query.targetRole) {
      qb.andWhere('appeal.target_role = :targetRole', { targetRole: query.targetRole });
    }

    if (query.source) {
      qb.andWhere('appeal.source = :source', { source: query.source });
    }

    const range = query.period ? this.getPeriodRange(query.period) : null;
    if (range) {
      qb.andWhere('appeal.created_at BETWEEN :from AND :to', {
        from: range.from,
        to: range.to,
      });
    }

    const [items, total] = await qb
      .orderBy('appeal.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const pageCount = Math.ceil(total / limit) || 1;
    const monthRange = this.getPeriodRange(AppealPeriodFilter.MONTH);
    // Statistika ro'yxat bilan BIR XIL qamrovda sanaladi: aks holda biriktirilgan
    // xodim 2 ta murojaat ko'rib turib, kartochkada 40 ni ko'rardi.
    const statsWhere = (base: FindOptionsWhere<Appeal>): FindOptionsWhere<Appeal> =>
      tenantWhere<Appeal>(
        this.tenant,
        assigneeOnly ? { ...base, assigneeUserId: assigneeOnly } : base,
        { branch: true },
      );
    const [totalCount, suggestionCount, complaintCount, monthCount] = await Promise.all([
      this.appealRepository.count({ where: statsWhere({}) }),
      this.appealRepository.count({ where: statsWhere({ type: AppealType.SUGGESTION }) }),
      this.appealRepository.count({ where: statsWhere({ type: AppealType.COMPLAINT }) }),
      this.appealRepository.count({
        where: statsWhere({ createdAt: Between(monthRange.from, monthRange.to) }),
      }),
    ]);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      meta: {
        page,
        limit,
        total,
        pageCount,
      },
      stats: {
        totalCount,
        suggestionCount,
        complaintCount,
        monthCount,
      },
    };
  }

  async findOne(id: string, viewer?: AppealViewer): Promise<AppealResponseSchema> {
    return this.toResponseDto(await this.findAppealEntity(id, this.resolveAssigneeFilter(viewer)));
  }

  /**
   * Ko'ruvchi rahbariyat bo'lmasa, natijani unga BIRIKTIRILGAN murojaatlar bilan
   * cheklaydi. Qamrovi tor bo'lib, kimligi noma'lum holat "hammasini ko'rsat"ga
   * aylanib ketmasin — shuning uchun bu holatda rad etiladi.
   */
  private resolveAssigneeFilter(viewer?: AppealViewer): string | null {
    if (!viewer || viewer.canReadAll) {
      return null;
    }
    if (!viewer.userId) {
      throw new ForbiddenException({
        message: {
          uz: 'Murojaatlarni ko\'rish uchun huquqingiz yetarli emas',
          ru: 'Недостаточно прав для просмотра обращений',
          en: 'Insufficient permissions to view appeals',
        },
      });
    }
    return viewer.userId;
  }

  /** Assigns (or, with null, unassigns) an appeal to a staff member and notifies them. */
  async assign(id: string, dto: AssignAppealDto, actor?: AppealActor): Promise<AppealResponseSchema> {
    const appeal = await this.findAppealEntity(id);

    if (dto.assigneeUserId) {
      const assignee = await this.userRepository.findOne({
        where: tenantWhere<User>(this.tenant, { id: dto.assigneeUserId }),
      });
      if (!assignee) {
        throw new NotFoundException('Assignee user not found');
      }
      if (assignee.status !== CommonStatus.ACTIVE) {
        throw new BadRequestException('Assignee user is not active');
      }
    }

    appeal.assigneeUserId = dto.assigneeUserId ?? null;
    const saved = await this.appealRepository.save(appeal);

    await this.recordAudit(
      actor?.userId,
      dto.assigneeUserId ? 'appeal.assigned' : 'appeal.unassigned',
      saved.id,
      { assigneeUserId: saved.assigneeUserId },
      actor?.ipAddress,
    );

    if (saved.assigneeUserId) {
      await this.queueAppealNotifications([saved.assigneeUserId], saved, 'assigned');
    }

    return this.toResponseDto(saved);
  }

  async update(id: string, dto: UpdateAppealDto, actor?: AppealActor): Promise<AppealResponseSchema> {
    const { resolutionNote, ...rest } = dto;
    if (Object.keys(rest).length === 0 && resolutionNote === undefined) {
      throw new BadRequestException('At least one appeal field must be provided');
    }

    const appeal = await this.findAppealEntity(id);
    const previousStatus = appeal.status;

    if (dto.fullName !== undefined) {
      appeal.fullName = this.normalizeText(dto.fullName);
    }
    if (dto.phone !== undefined) {
      appeal.phone = this.normalizePhone(dto.phone);
    }
    if (dto.type !== undefined) {
      appeal.type = dto.type;
    }
    if (dto.targetRole !== undefined) {
      appeal.targetRole = dto.targetRole;
    }
    if (dto.description !== undefined) {
      appeal.description = this.normalizeText(dto.description);
    }
    if (dto.source !== undefined) {
      appeal.source = dto.source;
    }

    if (dto.status !== undefined && dto.status !== previousStatus) {
      this.applyStatusTransition(appeal, previousStatus, dto.status, resolutionNote, actor);
    } else if (resolutionNote !== undefined) {
      appeal.resolutionNote = this.normalizeText(resolutionNote);
    }

    const saved = await this.appealRepository.save(appeal);

    await this.recordAudit(
      actor?.userId,
      'appeal.updated',
      saved.id,
      {
        statusFrom: previousStatus,
        statusTo: saved.status,
        changed: Object.keys(dto),
      },
      actor?.ipAddress,
    );

    return this.toResponseDto(saved);
  }

  /** Enforces the status state machine and resolution-note rules in one place. */
  private applyStatusTransition(
    appeal: Appeal,
    from: AppealStatus,
    to: AppealStatus,
    resolutionNote: string | undefined,
    actor?: AppealActor,
  ): void {
    const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Murojaat holatini "${from}" dan "${to}" ga o‘tkazib bo‘lmaydi`,
      );
    }

    const movingToTerminal = TERMINAL_STATUSES.includes(to);
    if (movingToTerminal) {
      const note = resolutionNote ? this.normalizeText(resolutionNote) : '';
      if (note.length < 3) {
        throw new BadRequestException(
          'Murojaatni yopish uchun izoh (resolutionNote) majburiy',
        );
      }
      appeal.resolutionNote = note;
      appeal.resolvedById = actor?.userId ?? null;
      appeal.resolvedAt = new Date();
    } else {
      // Reopening clears the prior resolution so the record stays truthful.
      appeal.resolutionNote = resolutionNote ? this.normalizeText(resolutionNote) : null;
      appeal.resolvedById = null;
      appeal.resolvedAt = null;
    }

    appeal.status = to;
  }

  async remove(id: string, actor?: AppealActor): Promise<void> {
    const appeal = await this.findAppealEntity(id);
    await this.appealRepository.softDelete(id);
    await this.recordAudit(actor?.userId, 'appeal.archived', appeal.id, undefined, actor?.ipAddress);
  }

  private async findAppealEntity(id: string, assigneeUserId?: string | null): Promise<Appeal> {
    const base: FindOptionsWhere<Appeal> = assigneeUserId ? { id, assigneeUserId } : { id };
    const appeal = await this.appealRepository.findOne({ where: tenantWhere<Appeal>(this.tenant, base, { branch: true }) });

    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    return appeal;
  }

  // ---- Notifications & audit (best-effort: never fail the main operation) ----

  /**
   * Yangi murojaat kimga boradi.
   *
   * Ilgari `target_role` bo'yicha o'sha lavozimdagi HAMMA xodimga borardi. Uch
   * muammo bir vaqtda: (1) sinf rahbari haqidagi shikoyat maktabdagi barcha
   * o'qituvchilarga, murojaat qiluvchining ismi bilan; (2) o'sha xodimlarda
   * `appeals.read` yo'q edi — xabar kelardi-yu, ochib bo'lmasdi; (3)
   * `doctor`/`librarian` uchun tizim roli umuman yo'q, ya'ni murojaat qora
   * tuynukka tushardi.
   *
   * Endi `target_role` faqat saralash belgisi. Xabar murojaat bilan ishlay
   * OLADIGANLARGA — maktabning `appeals.read` egalariga — boradi; ular esa
   * kerak bo'lsa aniq xodimga biriktiradi (`assign`).
   */
  private async notifyAppealHandlers(appeal: Appeal): Promise<void> {
    const recipients = await this.findAppealHandlerIds();
    if (recipients.length === 0) {
      return;
    }
    await this.queueAppealNotifications(recipients, appeal, 'new');
  }

  private async findAppealHandlerIds(): Promise<string[]> {
    try {
      const qb = this.userRepository
        .createQueryBuilder('user')
        .select('DISTINCT user.id', 'id')
        .innerJoin('user.roles', 'role')
        .innerJoin('role.permissions', 'permission')
        .where('permission.code = :code', { code: AppPermission.APPEALS_READ })
        .andWhere('user.status = :status', { status: CommonStatus.ACTIVE });
      // Tenant filtrisiz bu so'rov BARCHA maktablarning rahbariyatini qaytarardi —
      // bitta maktabga kelgan shikoyat boshqa maktab direktoriga, murojaat
      // qiluvchining ismi bilan birga, push bo'lib borardi.
      applyTenantScope(qb, 'user', this.tenant);
      const rows = await qb.getRawMany<{ id: string }>();
      return rows.map((row) => row.id);
    } catch (error) {
      this.logger.warn(`Failed to resolve appeal recipients: ${this.errorMessage(error)}`);
      return [];
    }
  }

  private async queueAppealNotifications(
    userIds: string[],
    appeal: Appeal,
    kind: 'new' | 'assigned',
  ): Promise<void> {
    const typeLabel = appeal.type === AppealType.COMPLAINT ? 'shikoyat' : 'taklif';
    const text =
      kind === 'new'
        ? `Yangi ${typeLabel}: ${appeal.fullName}`
        : `Sizga ${typeLabel} biriktirildi: ${appeal.fullName}`;

    await Promise.all(
      userIds.map((userId) =>
        this.notificationsService
          .queueNotification({
            recipientType: 'user',
            recipientId: userId,
            channel: NotificationChannel.PUSH,
            payload: {
              appealId: appeal.id,
              type: appeal.type,
              targetRole: appeal.targetRole,
              kind,
              text,
            },
          })
          .catch((error) =>
            this.logger.warn(`Failed to queue appeal notification: ${this.errorMessage(error)}`),
          ),
      ),
    );
  }

  private async recordAudit(
    userId: string | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.auditService.log({
        userId,
        action,
        entity: 'appeal',
        entityId,
        ipAddress,
        details,
      });
    } catch (error) {
      this.logger.warn(`Failed to write appeal audit log: ${this.errorMessage(error)}`);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getPeriodRange(period: AppealPeriodFilter): { from: Date; to: Date } {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);

    if (period === AppealPeriodFilter.TODAY) {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    if (period === AppealPeriodFilter.YESTERDAY) {
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(now.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    if (period === AppealPeriodFilter.WEEK) {
      from.setDate(now.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    to.setMonth(now.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  private toResponseDto(appeal: Appeal): AppealResponseSchema {
    return {
      id: appeal.id,
      fullName: appeal.fullName,
      phone: appeal.phone,
      type: appeal.type,
      targetRole: appeal.targetRole,
      description: appeal.description,
      source: appeal.source,
      status: appeal.status,
      assigneeUserId: appeal.assigneeUserId ?? null,
      resolutionNote: appeal.resolutionNote ?? null,
      resolvedById: appeal.resolvedById ?? null,
      resolvedAt: appeal.resolvedAt ?? null,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt,
      deletedAt: appeal.deletedAt,
      version: appeal.version,
    };
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = this.normalizeText(value);
    return normalized.length > 0 ? normalized : null;
  }

  private normalizePhone(value: string): string {
    return value.replace(/[\s()-]/g, '');
  }
}
