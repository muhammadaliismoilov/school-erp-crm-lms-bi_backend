import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AuditService } from '../audit/audit.service';
import { AcademicYear } from '../academic/entities/academic-year.entity';
import { User } from '../identity/entities/user.entity';
import { LessonSchedule } from '../lms/entities/lesson-schedule.entity';
import { LessonStatus } from '../lms/enums/lms.enums';
import {
  AdjustSalaryDto,
  RecalculateSalaryDto,
  SalaryQueryDto,
  TeacherRateQueryDto,
  UpsertTeacherRateDto,
} from './dto/salary.dto';
import { FinanceTransaction } from './entities/transaction.entity';
import { TeacherLessonRate } from './entities/teacher-lesson-rate.entity';
import { TeacherSalary } from './entities/teacher-salary.entity';
import { TeacherSalaryStatus } from './enums/salary-status.enum';

/** Amalni bajargan aktor — audit va snapshot uchun. */
export interface SalaryActor {
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

export interface TeacherRateRow {
  teacherId: string;
  fullName: string;
  phone: string | null;
  employmentType: string | null;
  level: string | null;
  ratePerLesson: number;
}

export interface TeacherRateListResult {
  items: TeacherRateRow[];
  meta: PageMeta;
  academicYearId: string | null;
}

export interface SalaryRow {
  id: string | null;
  teacherId: string;
  fullName: string;
  completedLessons: number;
  ratePerLesson: number;
  computedAmount: number;
  finalAmount: number;
  status: TeacherSalaryStatus;
  adjustmentReason: string | null;
  approvedAt: Date | null;
  transactionId: string | null;
}

export interface SalaryListResult {
  items: SalaryRow[];
  meta: PageMeta;
  period: string;
  academicYearId: string | null;
}

/** "salary" turidagi chiqim kategoriyasining nomi (mavjud bo'lsa bog'lanadi). */
const SALARY_CATEGORY_NAMES = ['Maosh', 'Oylik maosh', "O'qituvchi maoshi", 'Salary'];

@Injectable()
export class SalaryService {
  private readonly logger = new Logger(SalaryService.name);
  private static readonly TEACHER_ROLE = 'teacher';

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(AcademicYear)
    private readonly academicYears: Repository<AcademicYear>,
    @InjectRepository(LessonSchedule)
    private readonly lessons: Repository<LessonSchedule>,
    @InjectRepository(TeacherLessonRate)
    private readonly rates: Repository<TeacherLessonRate>,
    @InjectRepository(TeacherSalary)
    private readonly salaries: Repository<TeacherSalary>,
    @InjectRepository(FinanceTransaction)
    private readonly transactions: Repository<FinanceTransaction>,
    private readonly auditService: AuditService,
    private readonly tenant: TenantContextService,
  ) {}

  // ─── O'qituvchilar uchun dars stavkalari ────────────────────────────────

  async findTeacherRates(query: TeacherRateQueryDto): Promise<TeacherRateListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const academicYearId = await this.resolveAcademicYearId(query.academicYearId);

    const qb = this.teacherQuery(query.search);
    const [teachers, total] = await qb
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const rateMap = await this.rateMap(
      academicYearId,
      teachers.map((t) => t.id),
    );

    return {
      items: teachers.map((t) => ({
        teacherId: t.id,
        fullName: this.fullName(t),
        phone: t.phone ?? null,
        employmentType: this.profileString(t, 'employmentType'),
        level: this.profileString(t, 'level'),
        ratePerLesson: rateMap.get(t.id) ?? 0,
      })),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
      academicYearId,
    };
  }

  async upsertTeacherRate(
    teacherId: string,
    dto: UpsertTeacherRateDto,
    actor?: SalaryActor,
  ): Promise<TeacherRateRow> {
    const teacher = await this.findTeacher(teacherId);
    const academicYearId = await this.resolveAcademicYearId(dto.academicYearId, true);
    if (!academicYearId) {
      throw new BadRequestException('Joriy akademik yil topilmadi — academicYearId yuboring');
    }

    let rate = await this.rates.findOne({ where: { teacherId, academicYearId } });
    if (rate) {
      rate.ratePerLesson = dto.ratePerLesson;
    } else {
      rate = this.rates.create({
        teacherId,
        academicYearId,
        ratePerLesson: dto.ratePerLesson,
        schoolId: this.tenant.getSchoolId(),
        filialId: this.tenant.getBranchId(),
      });
    }
    await this.rates.save(rate);

    await this.recordAudit(actor?.userId, 'teacher_rate.upserted', teacherId, {
      academicYearId,
      ratePerLesson: dto.ratePerLesson,
    }, actor?.ipAddress);

    return {
      teacherId,
      fullName: this.fullName(teacher),
      phone: teacher.phone ?? null,
      employmentType: this.profileString(teacher, 'employmentType'),
      level: this.profileString(teacher, 'level'),
      ratePerLesson: dto.ratePerLesson,
    };
  }

  // ─── Oylik maoshni hisoblash va tasdiqlash ──────────────────────────────

  async findSalaries(query: SalaryQueryDto): Promise<SalaryListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const academicYearId = await this.resolveAcademicYearId(query.academicYearId);

    // Davr uchun yetishmayotgan maosh yozuvlarini avtomatik yaratamiz, shunda
    // har bir o'qituvchi ro'yxatda ko'rinadi va Tuzatish/Tasdiqlash ishlaydi.
    await this.ensureSalaryRows(query.period, academicYearId);

    const qb = this.teacherQuery(query.search);
    const [teachers, total] = await qb
      .orderBy('u.lastName', 'ASC')
      .addOrderBy('u.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const salaryMap = await this.salaryMap(
      query.period,
      teachers.map((t) => t.id),
    );

    return {
      items: teachers.map((t) => {
        const s = salaryMap.get(t.id);
        return {
          id: s?.id ?? null,
          teacherId: t.id,
          fullName: this.fullName(t),
          completedLessons: s ? this.effectiveLessons(s) : 0,
          ratePerLesson: s ? this.toNumber(s.ratePerLesson) : 0,
          computedAmount: s ? this.toNumber(s.computedAmount) : 0,
          finalAmount: s ? this.toNumber(s.finalAmount) : 0,
          status: s?.status ?? TeacherSalaryStatus.PENDING,
          adjustmentReason: s?.adjustmentReason ?? null,
          approvedAt: s?.approvedAt ?? null,
          transactionId: s?.transactionId ?? null,
        };
      }),
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) || 1 },
      period: query.period,
      academicYearId,
    };
  }

  async recalculate(dto: RecalculateSalaryDto, actor?: SalaryActor): Promise<{ updated: number }> {
    const academicYearId = await this.resolveAcademicYearId(dto.academicYearId);
    await this.ensureSalaryRows(dto.period, academicYearId);

    const rows = await this.salaries.find({ where: tenantWhere<TeacherSalary>(this.tenant, { period: dto.period }, { branch: true }) });
    const pending = rows.filter((r) => r.status !== TeacherSalaryStatus.APPROVED);
    if (pending.length === 0) {
      return { updated: 0 };
    }

    const counts = await this.completedLessonsByTeacher(dto.period);
    const rateMap = await this.rateMap(
      academicYearId,
      pending.map((r) => r.teacherId),
    );

    for (const row of pending) {
      row.completedLessons = counts.get(row.teacherId) ?? 0;
      row.ratePerLesson = rateMap.get(row.teacherId) ?? this.toNumber(row.ratePerLesson);
      row.computedAmount = this.round2(row.completedLessons * row.ratePerLesson);
      row.academicYearId = academicYearId;
      row.finalAmount = this.computeFinal(row);
    }
    await this.salaries.save(pending);

    await this.recordAudit(actor?.userId, 'teacher_salary.recalculated', dto.period, {
      period: dto.period,
      updated: pending.length,
    }, actor?.ipAddress);

    return { updated: pending.length };
  }

  async adjust(id: string, dto: AdjustSalaryDto, actor?: SalaryActor): Promise<SalaryRow> {
    const row = await this.findSalaryEntity(id);
    if (row.status === TeacherSalaryStatus.APPROVED) {
      throw new BadRequestException('Tasdiqlangan maoshni tuzatib bo‘lmaydi');
    }

    row.adjustedLessons = dto.adjustedLessons ?? null;
    row.adjustedAmount = dto.adjustedAmount ?? null;
    row.adjustmentReason = dto.adjustmentReason.trim();
    row.finalAmount = this.computeFinal(row);
    await this.salaries.save(row);

    await this.recordAudit(actor?.userId, 'teacher_salary.adjusted', row.id, {
      adjustedLessons: row.adjustedLessons,
      adjustedAmount: row.adjustedAmount,
    }, actor?.ipAddress);

    return this.toSalaryRow(row);
  }

  async approve(id: string, actor?: SalaryActor): Promise<SalaryRow> {
    const row = await this.findSalaryEntity(id);
    if (row.status === TeacherSalaryStatus.APPROVED) {
      throw new BadRequestException('Maosh allaqachon tasdiqlangan');
    }

    const teacher = await this.findTeacher(row.teacherId);
    const finalAmount = this.toNumber(row.finalAmount);

    // Yakuniy summa musbat bo'lsa, moliyaviy chiqim (transaction) yoziladi.
    if (finalAmount > 0) {
      const { month, year } = this.periodParts(row.period);
      const category = await this.findSalaryCategoryId();
      const tx = await this.transactions.save(
        this.transactions.create({
          sourceType: 'teacher_salary',
          sourceId: row.id,
          schoolId: row.schoolId ?? this.tenant.getSchoolId(),
          filialId: row.filialId ?? this.tenant.getBranchId(),
          type: 'expense',
          amount: finalAmount,
          date: this.periodEndDate(row.period),
          purposeCategoryId: category,
          personId: teacher.id,
          personName: this.fullName(teacher),
          personRole: SalaryService.TEACHER_ROLE,
          month,
          year,
          note: `Oylik maosh: ${row.period}`,
          createdBy: actor?.userId ?? null,
          createdByName: actor?.username ?? null,
          createdByRole: actor?.role ?? null,
          updatedBy: actor?.userId ?? null,
          updatedByName: actor?.username ?? null,
          updatedByRole: actor?.role ?? null,
        }),
      );
      row.transactionId = tx.id;
    }

    row.status = TeacherSalaryStatus.APPROVED;
    row.approvedAt = new Date();
    row.approvedBy = actor?.userId ?? null;
    row.approvedByName = actor?.username ?? null;
    await this.salaries.save(row);

    await this.recordAudit(actor?.userId, 'teacher_salary.approved', row.id, {
      period: row.period,
      finalAmount,
      transactionId: row.transactionId,
    }, actor?.ipAddress);

    return this.toSalaryRow(row);
  }

  // ─── Helperlar ──────────────────────────────────────────────────────────

  /** O'qituvchi (role=teacher, faol) foydalanuvchilar QueryBuilder'i. */
  private teacherQuery(search?: string) {
    const qb = this.users
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'role', 'role.name = :role', {
        role: SalaryService.TEACHER_ROLE,
      })
      .where('u.deleted_at IS NULL');

    // Faqat aktiv maktab o'qituvchilari (users faqat school_id, filial_id yo'q).
    applyTenantScope(qb, 'u', this.tenant);

    const term = this.nullableText(search);
    if (term) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('u.first_name ILIKE :s', { s: `%${term}%` })
            .orWhere('u.last_name ILIKE :s', { s: `%${term}%` })
            .orWhere("CONCAT(u.last_name, ' ', u.first_name) ILIKE :s", { s: `%${term}%` });
        }),
      );
    }
    return qb;
  }

  /** Davr uchun maosh yozuvi bo'lmagan o'qituvchilarga yozuv yaratadi. */
  private async ensureSalaryRows(period: string, academicYearId: string | null): Promise<void> {
    const teacherIds = await this.allTeacherIds();
    if (teacherIds.length === 0) return;

    const existing = await this.salaries.find({
      where: { period, teacherId: In(teacherIds) },
      select: { id: true, teacherId: true },
    });
    const existingIds = new Set(existing.map((r) => r.teacherId));
    const missing = teacherIds.filter((id) => !existingIds.has(id));
    if (missing.length === 0) return;

    const counts = await this.completedLessonsByTeacher(period);
    const rateMap = await this.rateMap(academicYearId, missing);

    const newRows = missing.map((teacherId) => {
      const completedLessons = counts.get(teacherId) ?? 0;
      const ratePerLesson = rateMap.get(teacherId) ?? 0;
      const computedAmount = this.round2(completedLessons * ratePerLesson);
      return this.salaries.create({
        teacherId,
        academicYearId,
        period,
        schoolId: this.tenant.getSchoolId(),
        filialId: this.tenant.getBranchId(),
        completedLessons,
        ratePerLesson,
        computedAmount,
        finalAmount: computedAmount,
        status: TeacherSalaryStatus.PENDING,
      });
    });
    await this.salaries.save(newRows);
  }

  /** Davrdagi 'completed' darslar sonini o'qituvchi bo'yicha guruhlab sanaydi. */
  private async completedLessonsByTeacher(period: string): Promise<Map<string, number>> {
    const { start, end } = this.periodRange(period);
    const rows = await this.lessons
      .createQueryBuilder('l')
      .select('l.teacher_id', 'teacherId')
      .addSelect('COUNT(l.id)', 'count')
      .where('l.teacher_id IS NOT NULL')
      .andWhere('l.status = :status', { status: LessonStatus.COMPLETED })
      .andWhere('l.lesson_date >= :start', { start })
      .andWhere('l.lesson_date <= :end', { end })
      .groupBy('l.teacher_id')
      .getRawMany<{ teacherId: string; count: string }>();

    return new Map(rows.map((r) => [r.teacherId, Number(r.count)]));
  }

  private async allTeacherIds(): Promise<string[]> {
    const qb = this.users
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .innerJoin('u.roles', 'role', 'role.name = :role', { role: SalaryService.TEACHER_ROLE })
      .where('u.deleted_at IS NULL');
    applyTenantScope(qb, 'u', this.tenant);
    const rows = await qb.getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  private async rateMap(
    academicYearId: string | null,
    teacherIds: string[],
  ): Promise<Map<string, number>> {
    if (!academicYearId || teacherIds.length === 0) return new Map();
    const rows = await this.rates.find({
      where: { academicYearId, teacherId: In(teacherIds) },
    });
    return new Map(rows.map((r) => [r.teacherId, this.toNumber(r.ratePerLesson)]));
  }

  private async salaryMap(period: string, teacherIds: string[]): Promise<Map<string, TeacherSalary>> {
    if (teacherIds.length === 0) return new Map();
    const rows = await this.salaries.find({ where: { period, teacherId: In(teacherIds) } });
    return new Map(rows.map((r) => [r.teacherId, r]));
  }

  /** Yakuniy summa: qo'lda kiritilgan qiymatlar ustun, aks holda avtomatik. */
  private computeFinal(row: TeacherSalary): number {
    if (row.adjustedAmount !== null && row.adjustedAmount !== undefined) {
      return this.round2(this.toNumber(row.adjustedAmount));
    }
    if (row.adjustedLessons !== null && row.adjustedLessons !== undefined) {
      return this.round2(row.adjustedLessons * this.toNumber(row.ratePerLesson));
    }
    return this.round2(this.toNumber(row.computedAmount));
  }

  private effectiveLessons(row: TeacherSalary): number {
    return row.adjustedLessons ?? row.completedLessons;
  }

  private async resolveAcademicYearId(
    provided: string | undefined,
    required = false,
  ): Promise<string | null> {
    if (provided) {
      const year = await this.academicYears.findOne({ where: { id: provided } });
      if (!year) throw new NotFoundException('Akademik yil topilmadi');
      return year.id;
    }
    const current = await this.academicYears.findOne({ where: { isCurrent: true } });
    if (!current && required) {
      throw new BadRequestException('Joriy akademik yil topilmadi — academicYearId yuboring');
    }
    return current?.id ?? null;
  }

  private async findTeacher(teacherId: string): Promise<User> {
    // roles eager:true, qayta so'ramaymiz (ikki marta join — kombinatorial portlash).
    const teacher = await this.users.findOne({
      where: tenantWhere<User>(this.tenant, { id: teacherId }),
    });
    if (!teacher) throw new NotFoundException('O‘qituvchi topilmadi');
    const isTeacher = teacher.roles?.some((r) => r.name === SalaryService.TEACHER_ROLE);
    if (!isTeacher) throw new BadRequestException('Bu foydalanuvchi o‘qituvchi emas');
    return teacher;
  }

  private async findSalaryEntity(id: string): Promise<TeacherSalary> {
    const row = await this.salaries.findOne({ where: tenantWhere<TeacherSalary>(this.tenant, { id }, { branch: true }) });
    if (!row) throw new NotFoundException('Maosh yozuvi topilmadi');
    return row;
  }

  private async findSalaryCategoryId(): Promise<string | null> {
    const row = await this.transactions.manager
      .createQueryBuilder()
      .select('c.id', 'id')
      .from('transaction_categories', 'c')
      .where('c.name IN (:...names)', { names: SALARY_CATEGORY_NAMES })
      .andWhere('c.deleted_at IS NULL')
      .limit(1)
      .getRawOne<{ id: string }>();
    return row?.id ?? null;
  }

  private toSalaryRow(row: TeacherSalary, fullName?: string): SalaryRow {
    return {
      id: row.id,
      teacherId: row.teacherId,
      fullName: fullName ?? '',
      completedLessons: this.effectiveLessons(row),
      ratePerLesson: this.toNumber(row.ratePerLesson),
      computedAmount: this.toNumber(row.computedAmount),
      finalAmount: this.toNumber(row.finalAmount),
      status: row.status,
      adjustmentReason: row.adjustmentReason ?? null,
      approvedAt: row.approvedAt ?? null,
      transactionId: row.transactionId ?? null,
    };
  }

  private fullName(u: User): string {
    return `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim() || u.username || u.id;
  }

  private profileString(u: User, key: string): string | null {
    const value = u.profile?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private periodRange(period: string): { start: string; end: string } {
    const { month, year } = this.periodParts(period);
    const start = `${period}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const end = `${period}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }

  private periodEndDate(period: string): string {
    return this.periodRange(period).end;
  }

  private periodParts(period: string): { month: number; year: number } {
    const [y, m] = period.split('-');
    return { year: Number(y), month: Number(m) };
  }

  private round2(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private toNumber(value: number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
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
      await this.auditService.log({ userId, action, entity: 'teacher_salary', entityId, ipAddress, details });
    } catch (error) {
      this.logger.warn(
        `Failed to write salary audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
