import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { PaymentType } from '../transactions/entities/payment-type.entity';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { StudentPaymentQueryDto } from './dto/student-payment-query.dto';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { StudentPayment, StudentPaymentStatus } from './entities/student-payment.entity';
import {
  StudentPaymentListResponseSchema,
  StudentPaymentOptionsSchema,
  StudentPaymentResponseSchema,
  StudentPaymentStatsSchema,
} from './swagger/student-payment-response.schema';

/** Amalni bajargan aktor — audit izi va egalik nazorati uchun. */
export interface StudentPaymentActor {
  userId?: string;
  username?: string;
  role?: string;
  permissions?: string[];
  ipAddress?: string;
}

interface RawStatsRow {
  plan: string | null;
  collected: string | null;
  today: string | null;
  count: string | null;
}

@Injectable()
export class StudentPaymentsService {
  private readonly logger = new Logger(StudentPaymentsService.name);

  /** Moliya defteridagi (transactions) o'quvchi-to'lov proyeksiyasining manba belgisi. */
  private static readonly TX_SOURCE = 'student_payment';

  /** Super-admin wildcard ruxsati — egalik cheklovini chetlab o'tadi. */
  private static readonly SUPER_ADMIN = '*.*';

  constructor(
    @InjectRepository(StudentPayment)
    private readonly payments: Repository<StudentPayment>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(SchoolClass)
    private readonly classes: Repository<SchoolClass>,
    @InjectRepository(PaymentType)
    private readonly paymentTypes: Repository<PaymentType>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── O'qish ───────────────────────────────────────────────────────────────

  async findAll(
    query: Partial<StudentPaymentQueryDto> = {},
  ): Promise<StudentPaymentListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.baseQuery(query)
      .orderBy('sp.paymentDate', 'DESC')
      .addOrderBy('sp.createdAt', 'DESC')
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

  /** Stat kartalar: oylik reja / yig'ilgan / qoldiq / bugun to'langan / soni. */
  private async computeStats(
    query: Partial<StudentPaymentQueryDto>,
  ): Promise<StudentPaymentStatsSchema> {
    const row = await this.baseQuery(query)
      .select('COALESCE(SUM(COALESCE(sp.plan_amount, sp.amount)), 0)', 'plan')
      .addSelect('COALESCE(SUM(sp.amount), 0)', 'collected')
      .addSelect('COALESCE(SUM(CASE WHEN sp.payment_date = :today THEN sp.amount ELSE 0 END), 0)', 'today')
      .addSelect('COUNT(sp.id)', 'count')
      .setParameter('today', this.today())
      .getRawOne<RawStatsRow>();

    const monthlyPlan = Number(row?.plan ?? 0);
    const collected = Number(row?.collected ?? 0);
    return {
      monthlyPlan,
      collected,
      remaining: Math.max(monthlyPlan - collected, 0),
      paidToday: Number(row?.today ?? 0),
      count: Number(row?.count ?? 0),
    };
  }

  /** Filtrlarni qo'llaydigan asosiy QueryBuilder. */
  private baseQuery(query: Partial<StudentPaymentQueryDto>) {
    const search = this.nullableText(query.search);
    const qb = this.payments
      .createQueryBuilder('sp')
      .leftJoin('sp.paymentType', 'paymentType')
      .addSelect(['paymentType.id', 'paymentType.name', 'paymentType.code']);

    if (query.month) {
      qb.andWhere('sp.month = :month', { month: query.month });
    }
    if (query.year) {
      qb.andWhere('sp.year = :year', { year: query.year });
    }
    if (query.paymentTypeId) {
      qb.andWhere('sp.payment_type_id = :ptId', { ptId: query.paymentTypeId });
    }
    if (query.paymentTypeCode) {
      qb.andWhere('paymentType.code = :ptCode', { ptCode: query.paymentTypeCode });
    }
    if (query.classId) {
      qb.andWhere('sp.class_id = :classId', { classId: query.classId });
    }
    if (query.studentId) {
      qb.andWhere('sp.student_id = :studentId', { studentId: query.studentId });
    }
    if (query.status) {
      qb.andWhere('sp.status = :status', { status: query.status });
    }
    if (query.dateFrom) {
      qb.andWhere('sp.payment_date >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('sp.payment_date <= :dateTo', { dateTo: query.dateTo });
    }
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('sp.student_name ILIKE :s', { s: `%${search}%` })
            .orWhere('sp.receipt_number ILIKE :s', { s: `%${search}%` })
            .orWhere('sp.class_name ILIKE :s', { s: `%${search}%` });
        }),
      );
    }
    return qb;
  }

  async findOne(id: string): Promise<StudentPaymentResponseSchema> {
    return this.toResponseDto(await this.findEntity(id));
  }

  /** Excel/CSV eksport uchun — filtrlangan barcha yozuvlar (sahifalashsiz). */
  async export(query: Partial<StudentPaymentQueryDto> = {}): Promise<StudentPaymentResponseSchema[]> {
    const items = await this.baseQuery(query)
      .orderBy('sp.paymentDate', 'DESC')
      .addOrderBy('sp.createdAt', 'DESC')
      .take(10000)
      .getMany();
    return items.map((item) => this.toResponseDto(item));
  }

  /** Dropdownlar uchun — faol to'lov turlari. */
  async options(): Promise<StudentPaymentOptionsSchema> {
    const paymentTypes = await this.paymentTypes.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return {
      paymentTypes: paymentTypes.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        isActive: p.isActive,
        sortOrder: p.sortOrder,
      })),
    };
  }

  // ─── Yozish ─────────────────────────────────────────────────────────────

  async create(
    dto: CreateStudentPaymentDto,
    actor?: StudentPaymentActor,
  ): Promise<StudentPaymentResponseSchema> {
    const student = await this.resolveStudent(dto.studentId);
    await this.assertPaymentType(dto.paymentTypeId);

    const date = dto.paymentDate ?? this.today();
    const year = dto.year ?? this.yearOf(date);
    const amount = dto.amount;
    const planAmount = dto.planAmount ?? null;

    const receiptNumber = dto.receiptNumber
      ? await this.assertReceiptUnique(dto.receiptNumber.trim())
      : await this.nextReceiptNumber(year);

    // To'lov yozuvi va uning moliya-defteri proyeksiyasi bitta DB tranzaksiyasida.
    const entity = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(StudentPayment);
      const saved = await repo.save(
        repo.create({
          studentId: student.id,
          studentName: student.name,
          classId: student.classId,
          className: student.className,
          amount,
          planAmount,
          paymentDate: date,
          month: dto.month ?? this.monthOf(date),
          year,
          paymentTypeId: dto.paymentTypeId ?? null,
          receiptNumber,
          status: dto.status ?? this.deriveStatus(amount, planAmount),
          note: this.nullableText(dto.note),
          createdBy: actor?.userId ?? null,
          createdByName: actor?.username ?? null,
          createdByRole: actor?.role ?? null,
          updatedBy: actor?.userId ?? null,
          updatedByName: actor?.username ?? null,
          updatedByRole: actor?.role ?? null,
        }),
      );
      await this.syncFinanceTransaction(manager, saved);
      return saved;
    });

    await this.recordAudit(actor?.userId, 'student_payment.created', entity.id, {
      studentId: entity.studentId,
      amount: entity.amount,
      receiptNumber: entity.receiptNumber,
    }, actor?.ipAddress);

    return this.findOne(entity.id);
  }

  async update(
    id: string,
    dto: UpdateStudentPaymentDto,
    actor?: StudentPaymentActor,
  ): Promise<StudentPaymentResponseSchema> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Kamida bitta maydon yuborilishi kerak');
    }
    const entity = await this.findEntity(id);
    this.assertCanModify(entity, actor, 'student_payment.update.forbidden');

    if (dto.studentId !== undefined) {
      const student = await this.resolveStudent(dto.studentId);
      entity.studentId = student.id;
      entity.studentName = student.name;
      entity.classId = student.classId;
      entity.className = student.className;
    }
    if (dto.amount !== undefined) entity.amount = dto.amount;
    if (dto.planAmount !== undefined) entity.planAmount = dto.planAmount ?? null;
    if (dto.paymentDate !== undefined) {
      entity.paymentDate = dto.paymentDate;
      entity.month = dto.month ?? this.monthOf(dto.paymentDate);
      entity.year = dto.year ?? this.yearOf(dto.paymentDate);
    }
    if (dto.month !== undefined) entity.month = dto.month;
    if (dto.year !== undefined) entity.year = dto.year;
    if (dto.paymentTypeId !== undefined) {
      await this.assertPaymentType(dto.paymentTypeId);
      entity.paymentTypeId = dto.paymentTypeId ?? null;
    }
    if (dto.receiptNumber !== undefined && dto.receiptNumber.trim() !== entity.receiptNumber) {
      entity.receiptNumber = await this.assertReceiptUnique(dto.receiptNumber.trim(), id);
    }
    if (dto.note !== undefined) entity.note = this.nullableText(dto.note);

    // Holat: aniq berilsa — o'sha; aks holda summa/rejaga qarab qayta hisoblanadi.
    if (dto.status !== undefined) {
      entity.status = dto.status;
    } else if (dto.amount !== undefined || dto.planAmount !== undefined) {
      entity.status = this.deriveStatus(entity.amount, entity.planAmount ?? null);
    }

    // Oxirgi o'zgartiruvchi — joriy aktor.
    entity.updatedBy = actor?.userId ?? null;
    entity.updatedByName = actor?.username ?? null;
    entity.updatedByRole = actor?.role ?? null;

    // Yozuvni saqlash va moliya-defteri proyeksiyasini sinxronlash — atomik.
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(StudentPayment).save(entity);
      await this.syncFinanceTransaction(manager, entity);
    });
    await this.recordAudit(actor?.userId, 'student_payment.updated', entity.id, {
      changed: Object.keys(dto),
    }, actor?.ipAddress);
    return this.findOne(entity.id);
  }

  async remove(id: string, actor?: StudentPaymentActor): Promise<void> {
    const entity = await this.findEntity(id);
    this.assertCanModify(entity, actor, 'student_payment.delete.forbidden');
    // To'lovni va uning moliya proyeksiyasini birga soft-delete qilamiz.
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(StudentPayment).softDelete(id);
      entity.deletedAt = new Date();
      await this.syncFinanceTransaction(manager, entity);
    });
    await this.recordAudit(actor?.userId, 'student_payment.deleted', entity.id, {
      receiptNumber: entity.receiptNumber,
      amount: entity.amount,
    }, actor?.ipAddress);
  }

  // ─── Moliya defteri bilan sinxronlash ──────────────────────────────────────

  /**
   * O'quvchi to'lovini umumiy moliya defteriga (`transactions`) proyeksiyalaydi.
   * Har bir to'lov uchun ko'pi bilan bitta `income` yozuvi bo'ladi — u
   * `sourceType='student_payment'` + `sourceId=<to'lov id>` orqali bog'lanadi.
   * To'langan summa 0 (kutilmoqda) yoki to'lov o'chirilgan bo'lsa, proyeksiya
   * ham soft-delete qilinadi. Atomiklik uchun chaqiruvchi tranzaksiya
   * `EntityManager`ini uzatadi — to'lov bilan proyeksiya har doim bir vaqtda
   * yoziladi yoki ikkalasi ham yozilmaydi.
   */
  private async syncFinanceTransaction(
    manager: EntityManager,
    payment: StudentPayment,
  ): Promise<void> {
    const repo = manager.getRepository(FinanceTransaction);
    const existing = await repo.findOne({
      where: { sourceType: StudentPaymentsService.TX_SOURCE, sourceId: payment.id },
      withDeleted: true,
    });

    const amount = Number(payment.amount) || 0;
    const shouldExist = amount > 0 && !payment.deletedAt;

    if (!shouldExist) {
      if (existing && !existing.deletedAt) {
        await repo.softDelete(existing.id);
      }
      return;
    }

    const fields = {
      sourceType: StudentPaymentsService.TX_SOURCE,
      sourceId: payment.id,
      type: 'income' as const,
      amount,
      date: payment.paymentDate,
      paymentTypeId: payment.paymentTypeId ?? null,
      personId: payment.studentId ?? null,
      personName: payment.studentName,
      personRole: 'student',
      studentId: payment.studentId ?? null,
      classId: payment.classId ?? null,
      month: payment.month,
      year: payment.year,
      note: `O'quvchi to'lovi — ${payment.receiptNumber}`,
      // Proyeksiya egasi = to'lovning egasi (kim yaratdi / o'zgartirdi).
      createdBy: payment.createdBy ?? null,
      createdByName: payment.createdByName ?? null,
      createdByRole: payment.createdByRole ?? null,
      updatedBy: payment.updatedBy ?? null,
      updatedByName: payment.updatedByName ?? null,
      updatedByRole: payment.updatedByRole ?? null,
    };

    if (existing) {
      Object.assign(existing, fields);
      existing.deletedAt = null; // ilgari o'chirilgan bo'lsa, tiklanadi
      await repo.save(existing);
    } else {
      await repo.save(repo.create(fields));
    }
  }

  /**
   * Barcha faol o'quvchi to'lovlarining moliya-defteri (`transactions`)
   * proyeksiyasini qayta sinxronlaydi — drift tuzatish (mas. to'lov summasi
   * tashqaridan o'zgartirilib, tranzaksiya eski qolib ketgan holatlar). Har
   * to'lov uchun `syncFinanceTransaction` qayta yuritiladi (idempotent):
   * yo'q bo'lsa yaratiladi, eski summa yangilanadi, o'chirilgan tiklanadi.
   */
  async reconcileFinanceTransactions(): Promise<{ processed: number; changed: number }> {
    const payments = await this.payments.find(); // soft-delete avtomatik chetlatiladi
    let changed = 0;
    for (const payment of payments) {
      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(FinanceTransaction);
        const before = await repo.findOne({
          where: { sourceType: StudentPaymentsService.TX_SOURCE, sourceId: payment.id },
          withDeleted: true,
        });
        await this.syncFinanceTransaction(manager, payment);
        const expected = Number(payment.amount) || 0;
        const wasCorrect = before && !before.deletedAt && Number(before.amount) === expected;
        if (expected > 0 && !wasCorrect) changed += 1;
      });
    }
    return { processed: payments.length, changed };
  }

  // ─── Egalik nazorati ────────────────────────────────────────────────────────

  /**
   * Yozuvni faqat uni yaratgan xodim yoki super-admin o'zgartira/o'chira oladi.
   * Egasi noma'lum eski yozuvlar (createdBy=null) — back-compat: `finance.manage`
   * guard (controller darajasida) yetarli, bu yerda bloklamaymiz.
   */
  private assertCanModify(
    entity: StudentPayment,
    actor: StudentPaymentActor | undefined,
    auditAction: string,
  ): void {
    if (!entity.createdBy) return;
    const isOwner = !!actor?.userId && entity.createdBy === actor.userId;
    const isSuperAdmin = actor?.permissions?.includes(StudentPaymentsService.SUPER_ADMIN) ?? false;
    if (isOwner || isSuperAdmin) return;

    void this.recordAudit(actor?.userId, auditAction, entity.id, {
      createdBy: entity.createdBy,
    }, actor?.ipAddress);
    throw new ForbiddenException(
      'Bu yozuvni faqat uni kiritgan xodim yoki super-admin o‘zgartira oladi',
    );
  }

  // ─── Helperlar ────────────────────────────────────────────────────────────

  private async findEntity(id: string): Promise<StudentPayment> {
    const entity = await this.payments.findOne({
      where: { id },
      relations: { paymentType: true },
    });
    if (!entity) {
      throw new NotFoundException('To‘lov topilmadi');
    }
    return entity;
  }

  private async resolveStudent(
    studentId: string,
  ): Promise<{ id: string; name: string; classId: string | null; className: string | null }> {
    const student = await this.students.findOne({
      where: { id: studentId },
      relations: { currentClass: true },
    });
    if (!student) throw new NotFoundException('O‘quvchi topilmadi');
    const name = `${student.lastName ?? ''} ${student.firstName ?? ''}`.trim() || student.studentCode;
    return {
      id: student.id,
      name,
      classId: student.currentClassId ?? null,
      className: student.currentClass?.name ?? null,
    };
  }

  private async assertPaymentType(paymentTypeId: string | undefined): Promise<void> {
    if (!paymentTypeId) return;
    const paymentType = await this.paymentTypes.findOne({ where: { id: paymentTypeId } });
    if (!paymentType) throw new NotFoundException('To‘lov turi topilmadi');
  }

  /** Summa va rejaga qarab holatni aniqlaydi. */
  private deriveStatus(amount: number, planAmount: number | null): StudentPaymentStatus {
    if (!amount || amount <= 0) return StudentPaymentStatus.PENDING;
    if (planAmount != null && planAmount > 0 && amount < planAmount) {
      return StudentPaymentStatus.PARTIAL;
    }
    return StudentPaymentStatus.PAID;
  }

  /** Yil bo'yicha keyingi kvitansiya raqami: KV-YYYY-NNNNN. */
  private async nextReceiptNumber(year: number): Promise<string> {
    const prefix = `KV-${year}-`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const last = await this.payments
        .createQueryBuilder('sp')
        .withDeleted()
        .where('sp.receipt_number LIKE :prefix', { prefix: `${prefix}%` })
        .orderBy('sp.receipt_number', 'DESC')
        .getOne();
      const lastSeq = last ? Number(last.receiptNumber.slice(prefix.length)) || 0 : 0;
      const candidate = `${prefix}${String(lastSeq + 1 + attempt).padStart(5, '0')}`;
      const exists = await this.payments
        .createQueryBuilder('sp')
        .withDeleted()
        .where('sp.receipt_number = :candidate', { candidate })
        .getCount();
      if (exists === 0) return candidate;
    }
    // Juda kam ehtimol — to'qnashuvda vaqt belgisiga qaytamiz.
    return `${prefix}${Date.now().toString().slice(-5)}`;
  }

  private async assertReceiptUnique(receiptNumber: string, exceptId?: string): Promise<string> {
    const qb = this.payments
      .createQueryBuilder('sp')
      .withDeleted()
      .where('sp.receipt_number = :receiptNumber', { receiptNumber });
    if (exceptId) qb.andWhere('sp.id != :exceptId', { exceptId });
    if ((await qb.getCount()) > 0) {
      throw new BadRequestException('Bu kvitansiya raqami allaqachon mavjud');
    }
    return receiptNumber;
  }

  private toResponseDto(entity: StudentPayment): StudentPaymentResponseSchema {
    return {
      id: entity.id,
      studentId: entity.studentId ?? null,
      studentName: entity.studentName,
      classId: entity.classId ?? null,
      className: entity.className ?? null,
      amount: this.toNumber(entity.amount) ?? 0,
      planAmount: this.toNumber(entity.planAmount),
      paymentDate: entity.paymentDate,
      month: entity.month,
      year: entity.year,
      paymentTypeId: entity.paymentTypeId ?? null,
      paymentTypeName: entity.paymentType?.name ?? null,
      paymentTypeCode: entity.paymentType?.code ?? null,
      receiptNumber: entity.receiptNumber,
      status: entity.status,
      note: entity.note ?? null,
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

  private async recordAudit(
    userId: string | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.auditService.log({ userId, action, entity: 'student_payment', entityId, ipAddress, details });
    } catch (error) {
      this.logger.warn(`Failed to write student payment audit log: ${this.errorMessage(error)}`);
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
