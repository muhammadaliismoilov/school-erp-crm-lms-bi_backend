import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { User } from '../identity/entities/user.entity';
import { CreateTransactionDto, TransactionType } from './dto/create-transaction.dto';
import { PaymentTypeQueryDto } from './dto/payment-type-query.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreatePaymentTypeDto, UpdatePaymentTypeDto } from './dto/upsert-payment-type.dto';
import {
  CreateTransactionCategoryDto,
  UpdateTransactionCategoryDto,
} from './dto/upsert-transaction-category.dto';
import { PaymentType } from './entities/payment-type.entity';
import { TransactionCategory, TransactionCategoryKind } from './entities/transaction-category.entity';
import {
  TransactionListResponseSchema,
  TransactionOptionsSchema,
  TransactionResponseSchema,
  TransactionStatisticsSchema,
  TransactionStatsSchema,
} from './swagger/transaction-response.schema';
import {
  PaymentTypeListResponseSchema,
  PaymentTypeResponseSchema,
  PaymentTypeStatsSchema,
} from './swagger/payment-type-response.schema';

/** Amalni bajargan aktor — audit izi uchun. */
export interface TransactionActor {
  userId?: string;
  username?: string;
  role?: string;
  permissions?: string[];
  ipAddress?: string;
}

interface RawAggRow {
  income: string | null;
  expense: string | null;
  count: string | null;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  /** Super-admin wildcard ruxsati — egalik cheklovini chetlab o'tadi. */
  private static readonly SUPER_ADMIN = '*.*';

  constructor(
    @InjectRepository(FinanceTransaction)
    private readonly transactions: Repository<FinanceTransaction>,
    @InjectRepository(PaymentType)
    private readonly paymentTypes: Repository<PaymentType>,
    @InjectRepository(TransactionCategory)
    private readonly categories: Repository<TransactionCategory>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly auditService: AuditService,
    private readonly tenant: TenantContextService,
  ) {}

  // ─── Tranzaksiyalar ────────────────────────────────────────────────────

  async findAll(query: Partial<TransactionQueryDto> = {}): Promise<TransactionListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.baseQuery(query);

    const [items, total] = await qb
      .orderBy('tx.date', 'DESC')
      .addOrderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const pageCount = Math.ceil(total / limit) || 1;
    const stats = await this.computeStats(query);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      meta: { page, limit, total, pageCount },
      stats,
    };
  }

  /** Joriy filtr bo'yicha balans/kirim/chiqim/soni — stat kartalar uchun. */
  private async computeStats(query: Partial<TransactionQueryDto>): Promise<TransactionStatsSchema> {
    const row = await this.baseQuery(query)
      .select('COALESCE(SUM(CASE WHEN tx.type = :inc THEN tx.amount ELSE 0 END), 0)', 'income')
      .addSelect('COALESCE(SUM(CASE WHEN tx.type = :exp THEN tx.amount ELSE 0 END), 0)', 'expense')
      .addSelect('COUNT(tx.id)', 'count')
      .setParameters({ inc: TransactionType.INCOME, exp: TransactionType.EXPENSE })
      .getRawOne<RawAggRow>();

    const totalIncome = Number(row?.income ?? 0);
    const totalExpense = Number(row?.expense ?? 0);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      count: Number(row?.count ?? 0),
    };
  }

  /** Statistika tab uchun agregatsiya. */
  async statistics(query: Partial<TransactionQueryDto> = {}): Promise<TransactionStatisticsSchema> {
    const totals = await this.computeStats(query);

    const monthlyRows = await this.baseQuery(query)
      .select('EXTRACT(MONTH FROM tx.date)', 'month')
      .addSelect('COALESCE(SUM(CASE WHEN tx.type = :inc THEN tx.amount ELSE 0 END), 0)', 'income')
      .addSelect('COALESCE(SUM(CASE WHEN tx.type = :exp THEN tx.amount ELSE 0 END), 0)', 'expense')
      .setParameters({ inc: TransactionType.INCOME, exp: TransactionType.EXPENSE })
      .groupBy('EXTRACT(MONTH FROM tx.date)')
      .orderBy('EXTRACT(MONTH FROM tx.date)', 'ASC')
      .getRawMany<{ month: string; income: string; expense: string }>();

    const monthly = monthlyRows.map((r) => {
      const income = Number(r.income);
      const expense = Number(r.expense);
      return { month: Number(r.month), income, expense, net: income - expense };
    });

    const byCategory = await this.breakdown(query, 'category');
    const byPaymentType = await this.breakdown(query, 'paymentType');

    return { totals, monthly, byCategory, byPaymentType };
  }

  private async breakdown(
    query: Partial<TransactionQueryDto>,
    dimension: 'category' | 'paymentType',
  ): Promise<{ id: string | null; name: string; amount: number; count: number }[]> {
    const isCategory = dimension === 'category';
    const idCol = isCategory ? 'tx.purpose_category_id' : 'tx.payment_type_id';
    const nameCol = isCategory ? 'category.name' : 'paymentType.name';

    const rows = await this.baseQuery(query)
      .select(idCol, 'id')
      .addSelect(`COALESCE(${nameCol}, '—')`, 'name')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'amount')
      .addSelect('COUNT(tx.id)', 'count')
      .groupBy(idCol)
      .addGroupBy(nameCol)
      .orderBy('amount', 'DESC')
      .getRawMany<{ id: string | null; name: string; amount: string; count: string }>();

    return rows.map((r) => ({
      id: r.id ?? null,
      name: r.name,
      amount: Number(r.amount),
      count: Number(r.count),
    }));
  }

  /** Filtrlarni qo'llaydigan asosiy QueryBuilder (join'lar bilan). */
  private baseQuery(query: Partial<TransactionQueryDto>) {
    const search = this.nullableText(query.search);
    const qb = this.transactions
      .createQueryBuilder('tx')
      .leftJoin('tx.purposeCategory', 'category')
      .addSelect(['category.id', 'category.name'])
      .leftJoin('tx.paymentType', 'paymentType')
      .addSelect(['paymentType.id', 'paymentType.name']);

    // Ko'p-maktabli ajratish — list, statistika va export shu qatorда filtrlanadi.
    applyTenantScope(qb, 'tx', this.tenant, { branch: true });

    if (query.type) {
      qb.andWhere('tx.type = :type', { type: query.type });
    }
    if (query.paymentTypeId) {
      qb.andWhere('tx.payment_type_id = :ptId', { ptId: query.paymentTypeId });
    }
    if (query.purposeCategoryId) {
      qb.andWhere('tx.purpose_category_id = :catId', { catId: query.purposeCategoryId });
    }
    if (query.personId) {
      qb.andWhere('tx.person_id = :personId', { personId: query.personId });
    }
    if (query.month) {
      qb.andWhere('tx.month = :month', { month: query.month });
    }
    if (query.classId) {
      qb.andWhere('tx.class_id = :classId', { classId: query.classId });
    }
    if (query.studentId) {
      qb.andWhere('tx.student_id = :studentId', { studentId: query.studentId });
    }
    if (query.dateFrom) {
      qb.andWhere('tx.date >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('tx.date <= :dateTo', { dateTo: query.dateTo });
    }
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('tx.note ILIKE :s', { s: `%${search}%` })
            .orWhere('tx.person_name ILIKE :s', { s: `%${search}%` })
            .orWhere('category.name ILIKE :s', { s: `%${search}%` });
        }),
      );
    }
    return qb;
  }

  async create(dto: CreateTransactionDto, actor?: TransactionActor): Promise<TransactionResponseSchema> {
    await this.assertCategory(dto.purposeCategoryId, dto.type);
    await this.assertPaymentType(dto.paymentTypeId);

    const person = await this.resolvePerson(dto.personId);
    const date = dto.date ?? this.today();

    const entity = await this.transactions.save(
      this.transactions.create({
        sourceType: 'manual',
        schoolId: this.tenant.getSchoolId(),
        filialId: this.tenant.getBranchId(),
        type: dto.type,
        amount: dto.amount,
        date,
        purposeCategoryId: dto.purposeCategoryId ?? null,
        paymentTypeId: dto.paymentTypeId ?? null,
        personId: person?.id ?? null,
        personName: person?.name ?? null,
        personRole: person?.role ?? null,
        month: dto.month ?? this.monthOf(date),
        year: dto.year ?? this.yearOf(date),
        note: this.nullableText(dto.note),
        receiptFileId: dto.receiptFileId ?? null,
        discountPercent: dto.discountPercent ?? null,
        price: dto.price ?? null,
        classId: dto.classId ?? null,
        studentId: dto.studentId ?? null,
        createdBy: actor?.userId ?? null,
        createdByName: actor?.username ?? null,
        createdByRole: actor?.role ?? null,
        updatedBy: actor?.userId ?? null,
        updatedByName: actor?.username ?? null,
        updatedByRole: actor?.role ?? null,
      }),
    );

    await this.recordAudit(actor?.userId, 'transaction.created', entity.id, {
      type: entity.type,
      amount: entity.amount,
    }, actor?.ipAddress);

    return this.findOne(entity.id);
  }

  async findOne(id: string): Promise<TransactionResponseSchema> {
    return this.toResponseDto(await this.findEntity(id));
  }

  async update(id: string, dto: UpdateTransactionDto, actor?: TransactionActor): Promise<TransactionResponseSchema> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Kamida bitta maydon yuborilishi kerak');
    }
    const entity = await this.findEntity(id);
    this.assertCanModify(entity, actor, 'transaction.update.forbidden');

    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.amount !== undefined) entity.amount = dto.amount;
    if (dto.date !== undefined) {
      entity.date = dto.date;
      entity.month = dto.month ?? this.monthOf(dto.date);
      entity.year = dto.year ?? this.yearOf(dto.date);
    }
    if (dto.month !== undefined) entity.month = dto.month;
    if (dto.year !== undefined) entity.year = dto.year;

    if (dto.purposeCategoryId !== undefined) {
      await this.assertCategory(dto.purposeCategoryId, dto.type ?? entity.type);
      entity.purposeCategoryId = dto.purposeCategoryId ?? null;
    }
    if (dto.paymentTypeId !== undefined) {
      await this.assertPaymentType(dto.paymentTypeId);
      entity.paymentTypeId = dto.paymentTypeId ?? null;
    }
    if (dto.personId !== undefined) {
      const person = await this.resolvePerson(dto.personId);
      entity.personId = person?.id ?? null;
      entity.personName = person?.name ?? null;
      entity.personRole = person?.role ?? null;
    }
    if (dto.note !== undefined) entity.note = this.nullableText(dto.note);
    if (dto.receiptFileId !== undefined) entity.receiptFileId = dto.receiptFileId ?? null;
    if (dto.discountPercent !== undefined) entity.discountPercent = dto.discountPercent ?? null;
    if (dto.price !== undefined) entity.price = dto.price ?? null;
    if (dto.classId !== undefined) entity.classId = dto.classId ?? null;
    if (dto.studentId !== undefined) entity.studentId = dto.studentId ?? null;

    // Oxirgi o'zgartiruvchi — joriy aktor.
    entity.updatedBy = actor?.userId ?? null;
    entity.updatedByName = actor?.username ?? null;
    entity.updatedByRole = actor?.role ?? null;

    await this.transactions.save(entity);
    await this.recordAudit(actor?.userId, 'transaction.updated', entity.id, {
      changed: Object.keys(dto),
    }, actor?.ipAddress);
    return this.findOne(entity.id);
  }

  async remove(id: string, actor?: TransactionActor): Promise<void> {
    const entity = await this.findEntity(id);
    this.assertCanModify(entity, actor, 'transaction.delete.forbidden');
    await this.transactions.softDelete(id);
    await this.recordAudit(actor?.userId, 'transaction.deleted', entity.id, {
      type: entity.type,
      amount: entity.amount,
    }, actor?.ipAddress);
  }

  /** Excel/CSV eksport uchun — filtrlangan barcha yozuvlar (sahifalashsiz). */
  async export(query: Partial<TransactionQueryDto> = {}): Promise<TransactionResponseSchema[]> {
    const items = await this.baseQuery(query)
      .orderBy('tx.date', 'DESC')
      .addOrderBy('tx.createdAt', 'DESC')
      .take(10000)
      .getMany();
    return items.map((item) => this.toResponseDto(item));
  }

  /** Dropdownlar uchun — to'lov turlari + kategoriyalar bitta chaqiruvda. */
  async options(): Promise<TransactionOptionsSchema> {
    const [paymentTypes, categories] = await Promise.all([
      this.paymentTypes.find({ where: { isActive: true }, order: { sortOrder: 'ASC', name: 'ASC' } }),
      this.categories.find({ where: { isActive: true }, order: { sortOrder: 'ASC', name: 'ASC' } }),
    ]);
    return {
      paymentTypes: paymentTypes.map((p) => this.toPaymentTypeDto(p)),
      categories: categories.map((c) => this.toCategoryDto(c)),
    };
  }

  // ─── To'lov turlari (boshqaruv) ─────────────────────────────────────────

  /** To'lov turlari ro'yxati — qidiruv + pagination + stat kartalar. */
  async findPaymentTypes(
    query: Partial<PaymentTypeQueryDto> = {},
  ): Promise<PaymentTypeListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.nullableText(query.search);

    const qb = this.paymentTypes.createQueryBuilder('pt');
    if (search) {
      qb.where('pt.name ILIKE :s', { s: `%${search}%` });
    }

    const [items, total] = await qb
      .orderBy('pt.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const pageCount = Math.ceil(total / limit) || 1;
    const stats = await this.paymentTypeStats();

    return {
      items: items.map((p) => this.toPaymentTypeRow(p)),
      meta: { page, limit, total, pageCount },
      stats,
    };
  }

  private async paymentTypeStats(): Promise<PaymentTypeStatsSchema> {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [total, addedThisMonth, latest] = await Promise.all([
      this.paymentTypes.count(),
      this.paymentTypes
        .createQueryBuilder('pt')
        .where('pt.createdAt >= :monthStart', { monthStart })
        .getCount(),
      this.paymentTypes.findOne({ where: {}, order: { createdAt: 'DESC' } }),
    ]);

    return {
      total,
      addedThisMonth,
      latestName: latest?.name ?? null,
      latestCreatedAt: latest?.createdAt ?? null,
    };
  }

  async listPaymentTypes(): Promise<PaymentType[]> {
    return this.paymentTypes.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createPaymentType(dto: CreatePaymentTypeDto, actor?: TransactionActor): Promise<PaymentType> {
    const code = this.slug(dto.code ?? dto.name);
    const exists = await this.paymentTypes.findOne({ where: { code } });
    if (exists) {
      throw new BadRequestException('Bu kodli to‘lov turi allaqachon mavjud');
    }
    const entity = await this.paymentTypes.save(
      this.paymentTypes.create({
        name: dto.name.trim(),
        code,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        isSystem: false,
      }),
    );
    await this.recordAudit(actor?.userId, 'payment_type.created', entity.id, { name: entity.name }, actor?.ipAddress);
    return entity;
  }

  async updatePaymentType(id: string, dto: UpdatePaymentTypeDto, actor?: TransactionActor): Promise<PaymentType> {
    const entity = await this.paymentTypes.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('To‘lov turi topilmadi');
    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.code !== undefined) entity.code = this.slug(dto.code);
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) entity.sortOrder = dto.sortOrder;
    await this.paymentTypes.save(entity);
    await this.recordAudit(actor?.userId, 'payment_type.updated', entity.id, undefined, actor?.ipAddress);
    return entity;
  }

  async removePaymentType(id: string, actor?: TransactionActor): Promise<void> {
    const entity = await this.paymentTypes.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('To‘lov turi topilmadi');
    if (entity.isSystem) {
      throw new BadRequestException('Tizim to‘lov turini o‘chirib bo‘lmaydi');
    }
    await this.paymentTypes.softDelete(id);
    await this.recordAudit(actor?.userId, 'payment_type.deleted', entity.id, undefined, actor?.ipAddress);
  }

  // ─── Kategoriyalar (boshqaruv) ──────────────────────────────────────────

  async listCategories(): Promise<TransactionCategory[]> {
    return this.categories.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createCategory(dto: CreateTransactionCategoryDto, actor?: TransactionActor): Promise<TransactionCategory> {
    if (dto.parentId) {
      const parent = await this.categories.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Umumiy kategoriya topilmadi');
    }
    const entity = await this.categories.save(
      this.categories.create({
        name: dto.name.trim(),
        kind: dto.kind ?? undefined,
        parentId: dto.parentId ?? null,
        isStudentTuition: dto.isStudentTuition ?? false,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        isSystem: false,
      }),
    );
    await this.recordAudit(actor?.userId, 'transaction_category.created', entity.id, { name: entity.name }, actor?.ipAddress);
    return entity;
  }

  async updateCategory(id: string, dto: UpdateTransactionCategoryDto, actor?: TransactionActor): Promise<TransactionCategory> {
    const entity = await this.categories.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Kategoriya topilmadi');
    if (dto.parentId !== undefined) {
      if (dto.parentId && dto.parentId === id) {
        throw new BadRequestException('Kategoriya o‘ziga ota bo‘la olmaydi');
      }
      entity.parentId = dto.parentId ?? null;
    }
    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.kind !== undefined) entity.kind = dto.kind;
    if (dto.isStudentTuition !== undefined) entity.isStudentTuition = dto.isStudentTuition;
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) entity.sortOrder = dto.sortOrder;
    await this.categories.save(entity);
    await this.recordAudit(actor?.userId, 'transaction_category.updated', entity.id, undefined, actor?.ipAddress);
    return entity;
  }

  async removeCategory(id: string, actor?: TransactionActor): Promise<void> {
    const entity = await this.categories.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Kategoriya topilmadi');
    if (entity.isSystem) {
      throw new BadRequestException('Tizim kategoriyasini o‘chirib bo‘lmaydi');
    }
    await this.categories.softDelete(id);
    await this.recordAudit(actor?.userId, 'transaction_category.deleted', entity.id, undefined, actor?.ipAddress);
  }

  // ─── Egalik nazorati ────────────────────────────────────────────────────

  /**
   * Tranzaksiyani faqat uni yaratgan xodim yoki super-admin o'zgartira/o'chira
   * oladi. Egasi noma'lum eski yozuvlar (createdBy=null) — back-compat:
   * granular `transactions.*` guard (controller darajasida) yetarli.
   */
  private assertCanModify(
    entity: FinanceTransaction,
    actor: TransactionActor | undefined,
    auditAction: string,
  ): void {
    if (!entity.createdBy) return;
    const isOwner = !!actor?.userId && entity.createdBy === actor.userId;
    const isSuperAdmin = actor?.permissions?.includes(TransactionsService.SUPER_ADMIN) ?? false;
    if (isOwner || isSuperAdmin) return;

    void this.recordAudit(actor?.userId, auditAction, entity.id, {
      createdBy: entity.createdBy,
    }, actor?.ipAddress);
    throw new ForbiddenException(
      'Bu yozuvni faqat uni kiritgan xodim yoki super-admin o‘zgartira oladi',
    );
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<FinanceTransaction> {
    const entity = await this.transactions.findOne({
      where: tenantWhere<FinanceTransaction>(this.tenant, { id }, { branch: true }),
      relations: { purposeCategory: true, paymentType: true },
    });
    if (!entity) {
      throw new NotFoundException('Tranzaksiya topilmadi');
    }
    return entity;
  }

  private async assertCategory(categoryId: string | undefined, type: string): Promise<void> {
    if (!categoryId) return;
    const category = await this.categories.findOne({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('To‘lov maqsadi (kategoriya) topilmadi');
    const kind = category.kind as string;
    if (kind !== TransactionCategoryKind.BOTH && kind !== type) {
      throw new BadRequestException('Tanlangan kategoriya bu tranzaksiya turiga mos emas');
    }
  }

  private async assertPaymentType(paymentTypeId: string | undefined): Promise<void> {
    if (!paymentTypeId) return;
    const paymentType = await this.paymentTypes.findOne({ where: { id: paymentTypeId } });
    if (!paymentType) throw new NotFoundException('To‘lov turi topilmadi');
  }

  private async resolvePerson(
    personId: string | undefined,
  ): Promise<{ id: string; name: string; role: string | null } | null> {
    if (!personId) return null;
    const user = await this.users.findOne({
      where: { id: personId },
      relations: { roles: true },
    });
    if (!user) throw new NotFoundException('Shaxs (foydalanuvchi) topilmadi');
    const name = `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || user.username || personId;
    const role = user.roles?.[0]?.name ?? null;
    return { id: user.id, name, role };
  }

  private toResponseDto(entity: FinanceTransaction): TransactionResponseSchema {
    return {
      id: entity.id,
      type: entity.type,
      amount: this.toNumber(entity.amount) ?? 0,
      date: entity.date,
      purposeCategoryId: entity.purposeCategoryId ?? null,
      purposeCategoryName: entity.purposeCategory?.name ?? null,
      paymentTypeId: entity.paymentTypeId ?? null,
      paymentTypeName: entity.paymentType?.name ?? null,
      personId: entity.personId ?? null,
      personName: entity.personName ?? null,
      personRole: entity.personRole ?? null,
      month: entity.month ?? null,
      year: entity.year ?? null,
      note: entity.note ?? null,
      receiptFileId: entity.receiptFileId ?? null,
      discountPercent: this.toNumber(entity.discountPercent),
      price: this.toNumber(entity.price),
      classId: entity.classId ?? null,
      studentId: entity.studentId ?? null,
      createdBy: entity.createdBy ?? null,
      createdByName: entity.createdByName ?? null,
      createdByRole: entity.createdByRole ?? null,
      updatedBy: entity.updatedBy ?? null,
      updatedByName: entity.updatedByName ?? null,
      updatedByRole: entity.updatedByRole ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt ?? null,
      version: entity.version,
    };
  }

  private toPaymentTypeDto(p: PaymentType) {
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      isActive: p.isActive,
      isSystem: p.isSystem,
      sortOrder: p.sortOrder,
    };
  }

  private toPaymentTypeRow(p: PaymentType): PaymentTypeResponseSchema {
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      isActive: p.isActive,
      isSystem: p.isSystem,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private toCategoryDto(c: TransactionCategory) {
    return {
      id: c.id,
      name: c.name,
      kind: c.kind,
      parentId: c.parentId ?? null,
      isStudentTuition: c.isStudentTuition,
      isActive: c.isActive,
      isSystem: c.isSystem,
      sortOrder: c.sortOrder,
    };
  }

  private async recordAudit(
    userId: string | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.auditService.log({ userId, action, entity: 'transaction', entityId, ipAddress, details });
    } catch (error) {
      this.logger.warn(`Failed to write transaction audit log: ${this.errorMessage(error)}`);
    }
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private monthOf(date: string): number {
    return new Date(`${date}T00:00:00Z`).getUTCMonth() + 1;
  }

  private yearOf(date: string): number {
    return new Date(`${date}T00:00:00Z`).getUTCFullYear();
  }

  private slug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'type';
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const n = this.normalizeText(value);
    return n.length > 0 ? n : null;
  }
}
