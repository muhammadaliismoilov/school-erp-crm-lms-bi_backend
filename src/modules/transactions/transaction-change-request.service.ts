import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { User } from '../identity/entities/user.entity';
import {
  ChangeRequestQueryDto,
  CreateChangeRequestDto,
  ReviewChangeRequestDto,
} from './dto/change-request.dto';
import {
  TransactionChangeRequest,
  TransactionChangeRequestStatus,
  TransactionChangeRequestType,
} from './entities/transaction-change-request.entity';

/** Amalni bajargan aktor — audit va snapshot uchun. */
export interface ChangeRequestActor {
  userId?: string;
  username?: string;
  role?: string;
  ipAddress?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface ChangeRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface ChangeRequestResponse {
  id: string;
  transactionId: string | null;
  requestType: TransactionChangeRequestType;
  proposedChanges: Record<string, unknown> | null;
  txType: string | null;
  txAmount: number | null;
  txDate: string | null;
  txPersonName: string | null;
  reason: string;
  status: TransactionChangeRequestStatus;
  requestedById: string | null;
  requestedByName: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  applied: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChangeRequestListResponse {
  items: ChangeRequestResponse[];
  meta: PageMeta;
  stats: ChangeRequestStats;
}

/** Tahrirlash so'rovida tranzaksiyaga qo'llanadigan maydonlar. */
const APPLICABLE_FIELDS = [
  'type',
  'amount',
  'date',
  'purposeCategoryId',
  'paymentTypeId',
  'month',
  'year',
  'note',
] as const;

@Injectable()
export class TransactionChangeRequestService {
  private readonly logger = new Logger(TransactionChangeRequestService.name);

  constructor(
    @InjectRepository(TransactionChangeRequest)
    private readonly requests: Repository<TransactionChangeRequest>,
    @InjectRepository(FinanceTransaction)
    private readonly transactions: Repository<FinanceTransaction>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly auditService: AuditService,
    private readonly tenant: TenantContextService,
  ) {}

  async create(dto: CreateChangeRequestDto, actor?: ChangeRequestActor): Promise<ChangeRequestResponse> {
    const tx = await this.transactions.findOne({ where: tenantWhere<FinanceTransaction>(this.tenant, { id: dto.transactionId }, { branch: true }) });
    if (!tx) throw new NotFoundException('Tranzaksiya topilmadi');

    if (dto.requestType === TransactionChangeRequestType.UPDATE) {
      const changes = this.cleanChanges(dto.proposedChanges as Record<string, unknown> | undefined);
      if (!changes || Object.keys(changes).length === 0) {
        throw new BadRequestException('Tahrirlash so‘rovida kamida bitta yangi qiymat bo‘lishi kerak');
      }
      dto.proposedChanges = changes as never;
    }

    const requestedByName = await this.resolveActorName(actor);

    const entity = await this.requests.save(
      this.requests.create({
        transactionId: tx.id,
        requestType: dto.requestType,
        proposedChanges:
          dto.requestType === TransactionChangeRequestType.UPDATE
            ? (dto.proposedChanges as Record<string, unknown>)
            : null,
        txType: tx.type,
        txAmount: tx.amount,
        txDate: tx.date,
        txPersonName: tx.personName ?? null,
        reason: dto.reason.trim(),
        status: TransactionChangeRequestStatus.PENDING,
        requestedById: actor?.userId ?? null,
        requestedByName,
        applied: false,
      }),
    );

    await this.recordAudit(actor?.userId, 'transaction_change_request.created', entity.id, {
      transactionId: tx.id,
      requestType: dto.requestType,
    }, actor?.ipAddress);

    return this.toResponse(entity);
  }

  async findAll(query: Partial<ChangeRequestQueryDto> = {}): Promise<ChangeRequestListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.baseQuery(query);
    const [items, total] = await qb
      .orderBy('tcr.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const stats = await this.computeStats();

    return {
      items: items.map((i) => this.toResponse(i)),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
      stats,
    };
  }

  async findOne(id: string): Promise<ChangeRequestResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async review(id: string, dto: ReviewChangeRequestDto, actor?: ChangeRequestActor): Promise<ChangeRequestResponse> {
    if (
      dto.status !== TransactionChangeRequestStatus.APPROVED &&
      dto.status !== TransactionChangeRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Holat approved yoki rejected bo‘lishi kerak');
    }

    const entity = await this.findEntity(id);
    if (entity.status !== TransactionChangeRequestStatus.PENDING) {
      throw new BadRequestException('Bu so‘rov allaqachon ko‘rib chiqilgan');
    }

    if (dto.status === TransactionChangeRequestStatus.APPROVED) {
      entity.applied = await this.applyChange(entity);
    } else {
      entity.applied = false;
    }

    entity.status = dto.status;
    entity.reviewNote = dto.reviewNote?.trim() || null;
    entity.reviewedById = actor?.userId ?? null;
    entity.reviewedByName = await this.resolveActorName(actor);
    entity.reviewedAt = new Date();
    await this.requests.save(entity);

    await this.recordAudit(actor?.userId, `transaction_change_request.${dto.status}`, entity.id, {
      transactionId: entity.transactionId,
      applied: entity.applied,
    }, actor?.ipAddress);

    return this.toResponse(entity);
  }

  async remove(id: string, actor?: ChangeRequestActor): Promise<void> {
    const entity = await this.findEntity(id);
    await this.requests.softDelete(id);
    await this.recordAudit(actor?.userId, 'transaction_change_request.deleted', entity.id, undefined, actor?.ipAddress);
  }

  // ─── Qo'llash ─────────────────────────────────────────────────────────────

  /**
   * Tasdiqlangan so'rovni tranzaksiyaga qo'llaydi. Tranzaksiya o'chirilgan/yo'q
   * bo'lsa qo'llanmaydi (false qaytadi). Bu rasmiy tasdiq oqimi bo'lgani uchun
   * yozuv egaligi tekshirilmaydi.
   */
  private async applyChange(entity: TransactionChangeRequest): Promise<boolean> {
    if (!entity.transactionId) return false;
    const tx = await this.transactions.findOne({ where: tenantWhere<FinanceTransaction>(this.tenant, { id: entity.transactionId }, { branch: true }) });
    if (!tx) return false;

    if (entity.requestType === TransactionChangeRequestType.DELETE) {
      await this.transactions.softDelete(tx.id);
      return true;
    }

    const changes = (entity.proposedChanges ?? {}) as Record<string, unknown>;

    for (const field of APPLICABLE_FIELDS) {
      if (changes[field] !== undefined) {
        (tx as unknown as Record<string, unknown>)[field] = changes[field];
      }
    }
    // Sana o'zgarsa, oy/yilni moslab qo'yamiz (so'rovda alohida berilmagan bo'lsa).
    if (changes.date !== undefined) {
      const date = String(changes.date).slice(0, 10);
      tx.date = date;
      if (changes.month === undefined) tx.month = this.monthOf(date);
      if (changes.year === undefined) tx.year = this.yearOf(date);
    }
    // Shaxs o'zgarsa — snapshot ism/rolni yangilaymiz.
    if (changes.personId !== undefined) {
      const person = await this.resolvePerson(changes.personId as string | null);
      tx.personId = person?.id ?? null;
      tx.personName = person?.name ?? null;
      tx.personRole = person?.role ?? null;
    }

    await this.transactions.save(tx);
    return true;
  }

  // ─── Helperlar ────────────────────────────────────────────────────────────

  private baseQuery(query: Partial<ChangeRequestQueryDto>) {
    const qb = this.requests.createQueryBuilder('tcr');

    if (query.status) {
      qb.andWhere('tcr.status = :status', { status: query.status });
    }
    if (query.dateFrom) {
      qb.andWhere('tcr.created_at >= :dateFrom', { dateFrom: `${query.dateFrom} 00:00:00` });
    }
    if (query.dateTo) {
      qb.andWhere('tcr.created_at <= :dateTo', { dateTo: `${query.dateTo} 23:59:59` });
    }
    const search = this.nullableText(query.search);
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('tcr.reason ILIKE :s', { s: `%${search}%` })
            .orWhere('tcr.tx_person_name ILIKE :s', { s: `%${search}%` })
            .orWhere('tcr.requested_by_name ILIKE :s', { s: `%${search}%` });
        }),
      );
    }
    return qb;
  }

  private async computeStats(): Promise<ChangeRequestStats> {
    const row = await this.requests
      .createQueryBuilder('tcr')
      .select('COUNT(tcr.id)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE tcr.status = 'pending')`, 'pending')
      .addSelect(`COUNT(*) FILTER (WHERE tcr.status = 'approved')`, 'approved')
      .addSelect(`COUNT(*) FILTER (WHERE tcr.status = 'rejected')`, 'rejected')
      .getRawOne<{ total: string; pending: string; approved: string; rejected: string }>();

    return {
      total: Number(row?.total ?? 0),
      pending: Number(row?.pending ?? 0),
      approved: Number(row?.approved ?? 0),
      rejected: Number(row?.rejected ?? 0),
    };
  }

  private async findEntity(id: string): Promise<TransactionChangeRequest> {
    const entity = await this.requests.findOne({ where: tenantWhere<TransactionChangeRequest>(this.tenant, { id }, { branch: true }) });
    if (!entity) throw new NotFoundException('O‘zgartirish so‘rovi topilmadi');
    return entity;
  }

  private cleanChanges(
    changes: Record<string, unknown> | undefined,
  ): Record<string, unknown> | null {
    if (!changes) return null;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && value !== null && value !== '') {
        out[key] = value;
      }
    }
    return out;
  }

  private async resolveActorName(actor?: ChangeRequestActor): Promise<string | null> {
    if (!actor?.userId) return actor?.username ?? null;
    const user = await this.users.findOne({ where: tenantWhere<User>(this.tenant, { id: actor.userId }, { branch: true }) });
    if (!user) return actor.username ?? null;
    return `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || user.username || actor.username || null;
  }

  private async resolvePerson(
    personId: string | null,
  ): Promise<{ id: string; name: string; role: string | null } | null> {
    if (!personId) return null;
    // roles eager:true, qayta so'ramaymiz (ikki marta join — kombinatorial portlash).
    const user = await this.users.findOne({ where: tenantWhere<User>(this.tenant, { id: personId }, { branch: true }) });
    if (!user) throw new NotFoundException('Shaxs (foydalanuvchi) topilmadi');
    const name = `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || user.username || personId;
    return { id: user.id, name, role: user.roles?.[0]?.name ?? null };
  }

  private toResponse(e: TransactionChangeRequest): ChangeRequestResponse {
    return {
      id: e.id,
      transactionId: e.transactionId ?? null,
      requestType: e.requestType,
      proposedChanges: e.proposedChanges ?? null,
      txType: e.txType ?? null,
      txAmount: this.toNumber(e.txAmount),
      txDate: e.txDate ?? null,
      txPersonName: e.txPersonName ?? null,
      reason: e.reason,
      status: e.status,
      requestedById: e.requestedById ?? null,
      requestedByName: e.requestedByName ?? null,
      reviewedById: e.reviewedById ?? null,
      reviewedByName: e.reviewedByName ?? null,
      reviewedAt: e.reviewedAt ?? null,
      reviewNote: e.reviewNote ?? null,
      applied: e.applied,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private monthOf(date: string): number {
    return new Date(`${date}T00:00:00Z`).getUTCMonth() + 1;
  }

  private yearOf(date: string): number {
    return new Date(`${date}T00:00:00Z`).getUTCFullYear();
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = value.trim().replace(/\s+/g, ' ');
    return n.length > 0 ? n : null;
  }

  private async recordAudit(
    userId: string | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.auditService.log({ userId, action, entity: 'transaction_change_request', entityId, ipAddress, details });
    } catch (error) {
      this.logger.warn(
        `Failed to write change-request audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
