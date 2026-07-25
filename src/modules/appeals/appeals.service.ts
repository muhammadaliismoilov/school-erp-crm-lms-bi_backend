import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Between, Brackets, Repository } from 'typeorm';
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
  TargetRole,
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

/**
 * Maps a public-facing target lavozim to the system role name(s) whose holders
 * should be notified. Roles without a backing system role (doctor/librarian)
 * simply yield no recipients until such roles exist.
 */
const TARGET_ROLE_TO_ROLE_NAMES: Record<TargetRole, string[]> = {
  [TargetRole.CLASS_TEACHER]: ['teacher'],
  [TargetRole.DEPUTY_DIRECTOR]: ['supermanager', 'manager'],
  [TargetRole.DIRECTOR]: ['director'],
  [TargetRole.ACCOUNTANT]: ['accountant'],
  [TargetRole.SALES_MANAGER]: ['sales-manager'],
  [TargetRole.PSYCHOLOGIST]: ['psychologist'],
  [TargetRole.DOCTOR]: ['doctor'],
  [TargetRole.LIBRARIAN]: ['librarian'],
};

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
    await this.resolveActiveLink(token);

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
    await this.notifyTargetRoleHolders(appeal);
    return { id: appeal.id };
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
    await this.notifyTargetRoleHolders(appeal);

    return this.toResponseDto(appeal);
  }

  async findAll(query: Partial<AppealQueryDto> = {}): Promise<AppealListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.appealRepository.createQueryBuilder('appeal').where('1 = 1');
    applyTenantScope(qb, 'appeal', this.tenant, { branch: true });
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
    const [totalCount, suggestionCount, complaintCount, monthCount] = await Promise.all([
      this.appealRepository.count({ where: tenantWhere<Appeal>(this.tenant, {}, { branch: true }) }),
      this.appealRepository.count({ where: tenantWhere<Appeal>(this.tenant, { type: AppealType.SUGGESTION }, { branch: true }) }),
      this.appealRepository.count({ where: tenantWhere<Appeal>(this.tenant, { type: AppealType.COMPLAINT }, { branch: true }) }),
      this.appealRepository.count({
        where: tenantWhere<Appeal>(this.tenant, { createdAt: Between(monthRange.from, monthRange.to) }, { branch: true }),
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

  async findOne(id: string): Promise<AppealResponseSchema> {
    return this.toResponseDto(await this.findAppealEntity(id));
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

  private async findAppealEntity(id: string): Promise<Appeal> {
    const appeal = await this.appealRepository.findOne({ where: tenantWhere<Appeal>(this.tenant, { id }, { branch: true }) });

    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    return appeal;
  }

  // ---- Notifications & audit (best-effort: never fail the main operation) ----

  private async notifyTargetRoleHolders(appeal: Appeal): Promise<void> {
    const roleNames = TARGET_ROLE_TO_ROLE_NAMES[appeal.targetRole] ?? [];
    if (roleNames.length === 0) {
      return;
    }
    const recipients = await this.findActiveUserIdsByRoleNames(roleNames);
    if (recipients.length === 0) {
      return;
    }
    await this.queueAppealNotifications(recipients, appeal, 'new');
  }

  private async findActiveUserIdsByRoleNames(roleNames: string[]): Promise<string[]> {
    try {
      const rows = await this.userRepository
        .createQueryBuilder('user')
        .select('user.id', 'id')
        .innerJoin('user.roles', 'role')
        .where('role.name IN (:...roleNames)', { roleNames })
        .andWhere('user.status = :status', { status: CommonStatus.ACTIVE })
        .getRawMany<{ id: string }>();
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
