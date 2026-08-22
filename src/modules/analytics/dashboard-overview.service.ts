import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppPermission } from '../../common/constants/permissions';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { permissionMatches } from '../../common/security/permission.matcher';
import { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { ClassSession } from '../attendance/entities/class-session.entity';
import { SessionStatus } from '../../common/enums/session-status.enum';
import { Lead } from '../crm/entities/lead.entity';
import { LeadStatus } from '../crm/enums/lead-status.enum';
import { Payroll } from '../hr/entities/payroll.entity';
import { StaffCertificate } from '../hr/entities/staff-certificate.entity';
import { PayrollStatus } from '../hr/enums/hr.enums';
import { Student } from '../students/entities/student.entity';
import { StudentStatus } from '../students/enums/student-status.enum';
import { StudentPayment } from '../student-payments/entities/student-payment.entity';
import { DebtsService } from '../student-payments/debts.service';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Branch } from '../settings/entities/branch.entity';

// ─── Javob shakli ───────────────────────────────────────────────────────────

export interface DashboardOverview {
  /** Maktab egasi (super-admin, `*.*`) — frontend KPI tartibini shu bo'yicha tanlaydi. */
  isOwner: boolean;
  generatedAt: string;
  students?: { active: number; newThisMonth: number; spark: number[] };
  attendanceToday?: { present: number; late: number; absent: number; totalActive: number; ratePct: number | null };
  revenue?: { thisMonth: number; lastMonth: number; deltaPct: number | null; spark: number[] };
  debtors?: { count: number; amount: number };
  payrollFund?: { thisMonth: number };
  leads?: { newThisWeek: number; prevWeek: number; conversionRate: number | null; spark: number[] };
  /** BUGUN paneli: dars sessiyalari holati. */
  sessionsToday?: { total: number; confirmed: number; cancelled: number; pending: number };
  /** BUGUN paneli: bugun qabul qilingan to'lovlar. */
  paymentsToday?: { count: number; amount: number };
  /** BUGUN paneli: bugun kelmagan o'quvchilar (birinchi 8 ta ism). */
  absentPreview?: string[];
  /** Grafik: oxirgi 30 kun davomat foizi (yozuv bo'lmagan kun null — dam olish). */
  attendanceTrend?: Array<{ date: string; came: number; pct: number | null }>;
  /** Grafik: lidlar voronkasi (kanban tartibida) + rad etilganlar. */
  leadFunnel?: Array<{ status: string; count: number }>;
  /** FAQAT EGA: filiallar taqqoslash jadvali (filial tanlovidan qat'i nazar butun maktab). */
  branches?: Array<{
    id: string | null;
    name: string;
    students: number;
    revenueThisMonth: number;
    cameToday: number;
    attendancePct: number | null;
    leadsWeek: number;
  }>;
  /** FAQAT EGA: oxirgi faoliyat (audit'dan 10 yozuv). */
  recentActivity?: Array<{ at: string; actor: string | null; action: string; entity: string }>;
  /** Diqqat markazi — frontend key bo'yicha yorliq/havolani o'zi biladi. */
  actionCenter: Array<{ key: string; count: number }>;
}

interface CacheEntry {
  at: number;
  data: DashboardOverview;
}

const CACHE_TTL_MS = 45_000;

/** Turniketda "kelgan" hisoblanadigan statuslar. */
const PRESENT_SET = [AttendanceStatus.PRESENT, AttendanceStatus.LEFT_EARLY, AttendanceStatus.EXCUSED];

/**
 * Asosiy dashboard uchun yig'ma ko'rsatkichlar — bitta so'rovda hamma KPI.
 * Har seksiya foydalanuvchining ruxsatiga qarab kiritiladi (ko'rmasligi
 * kerak bo'lgan bo'lim umuman qaytmaydi). 45s kesh — 1000+ foydalanuvchida
 * ham DB'ni bosmaydi.
 */
@Injectable()
export class DashboardOverviewService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(ClassSession) private readonly sessions: Repository<ClassSession>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(Payroll) private readonly payrolls: Repository<Payroll>,
    @InjectRepository(StaffCertificate) private readonly certificates: Repository<StaffCertificate>,
    @InjectRepository(StudentPayment) private readonly payments: Repository<StudentPayment>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    private readonly debtsService: DebtsService,
    private readonly tenant: TenantContextService,
  ) {}

  async overview(user: AuthenticatedUser): Promise<DashboardOverview> {
    const can = (code: string) =>
      (user.permissions ?? []).some((assigned) => permissionMatches(assigned, code));
    const isOwner = (user.permissions ?? []).includes(AppPermission.SUPER_ADMIN) || can('*.*');

    const flags = [
      can(AppPermission.STUDENTS_READ) ? 's' : '',
      can(AppPermission.ATTENDANCE_RECORDS_READ) ? 'a' : '',
      can(AppPermission.FINANCE_READ) ? 'f' : '',
      can(AppPermission.HR_PAYROLLS_READ) ? 'p' : '',
      can(AppPermission.CRM_LEADS_READ) ? 'c' : '',
      can(AppPermission.HR_STAFF_CERTIFICATES_READ) ? 'h' : '',
    ].join('');
    const cacheKey = `${this.tenant.getSchoolId() ?? '-'}|${this.tenant.getBranchId() ?? '-'}|${flags}|${isOwner ? 'o' : ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    const today = isoDate(new Date());
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const tasks: Promise<void>[] = [];
    const result: DashboardOverview = {
      isOwner,
      generatedAt: new Date().toISOString(),
      actionCenter: [],
    };

    // Avval 3 ta mustaqil blok (o'quvchilar KPI, bugungi davomat, davomat
    // trendi) shu bir xil hisobni 3 marta alohida so'rar edi. Endi bitta
    // memoized promise — birinchi chaqiruv so'raydi, qolganlari shunga
    // qo'shiladi (T-07).
    let activeStudentCountPromise: Promise<number> | null = null;
    const activeStudentCount = (): Promise<number> => {
      if (!activeStudentCountPromise) {
        activeStudentCountPromise = this.students.count({
          where: tenantWhere<Student>(this.tenant, { status: StudentStatus.ACTIVE }, { branch: true }),
        });
      }
      return activeStudentCountPromise;
    };

    // ─── O'quvchilar KPI ────────────────────────────────────────────────────
    if (can(AppPermission.STUDENTS_READ)) {
      tasks.push(
        (async () => {
          const active = await activeStudentCount();
          const sparkQb = this.students
            .createQueryBuilder('st')
            .select("to_char(st.created_at, 'YYYY-MM')", 'ym')
            .addSelect('COUNT(*)', 'cnt')
            .where('st.deleted_at IS NULL')
            .andWhere("st.created_at >= (CURRENT_DATE - INTERVAL '6 months')")
            .groupBy('ym')
            .orderBy('ym', 'ASC');
          applyTenantScope(sparkQb, 'st', this.tenant, { branch: true });
          const rows = await sparkQb.getRawMany<{ ym: string; cnt: string }>();
          const spark = lastMonthsSeries(rows, 6, year, month);
          const newThisMonth = spark[spark.length - 1] ?? 0;
          result.students = { active, newThisMonth, spark };
        })(),
      );
    }

    // ─── Bugungi davomat (jonli, turniket) ──────────────────────────────────
    if (can(AppPermission.ATTENDANCE_RECORDS_READ)) {
      tasks.push(
        (async () => {
          const qb = this.attendance
            .createQueryBuilder('ar')
            .select('ar.status', 'status')
            .addSelect('COUNT(*)', 'cnt')
            .where('ar.deleted_at IS NULL')
            .andWhere('ar.date = :today', { today })
            .groupBy('ar.status');
          applyTenantScope(qb, 'ar', this.tenant, { branch: true });
          const rows = await qb.getRawMany<{ status: AttendanceStatus; cnt: string }>();
          const by = new Map(rows.map((r) => [r.status, Number(r.cnt)]));
          const present = PRESENT_SET.reduce((s, st) => s + (by.get(st) ?? 0), 0);
          const late = by.get(AttendanceStatus.LATE) ?? 0;
          const absent = by.get(AttendanceStatus.ABSENT) ?? 0;
          const totalActive = can(AppPermission.STUDENTS_READ)
            ? await activeStudentCount()
            : present + late + absent;
          const seen = present + late;
          result.attendanceToday = {
            present,
            late,
            absent,
            totalActive,
            ratePct: totalActive > 0 ? Math.round((seen / totalActive) * 100) : null,
          };
        })(),
      );
    }

    // ─── Tushum + qarzdorlik (moliya) ───────────────────────────────────────
    if (can(AppPermission.FINANCE_READ)) {
      tasks.push(
        (async () => {
          // StudentPayment'da year/month ustunlari tayyor — 12 oylik seriya bitta so'rovda.
          const qb = this.payments
            .createQueryBuilder('sp')
            .select('sp.year', 'y')
            .addSelect('sp.month', 'm')
            .addSelect('COALESCE(SUM(sp.amount), 0)', 'sum')
            .where('sp.deleted_at IS NULL')
            .groupBy('sp.year')
            .addGroupBy('sp.month');
          applyTenantScope(qb, 'sp', this.tenant, { branch: true });
          const rows = await qb.getRawMany<{ y: number; m: number; sum: string }>();
          const byYm = new Map(rows.map((r) => [`${r.y}-${String(r.m).padStart(2, '0')}`, Number(r.sum)]));
          const spark: number[] = [];
          for (let i = 11; i >= 0; i -= 1) {
            const d = new Date(Date.UTC(year, month - 1 - i, 1));
            spark.push(byYm.get(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`) ?? 0);
          }
          const thisMonth = spark[11] ?? 0;
          const lastMonth = spark[10] ?? 0;
          result.revenue = {
            thisMonth,
            lastMonth,
            deltaPct: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
            spark,
          };
        })(),
      );
      tasks.push(
        (async () => {
          try {
            const overview = await this.debtsService.getOverview();
            result.debtors = {
              count: overview.kpi.debtorCount,
              amount: overview.kpi.totalOutstanding,
            };
            if (overview.kpi.debtorCount > 0) {
              result.actionCenter.push({ key: 'debtors', count: overview.kpi.debtorCount });
            }
          } catch {
            // Qarz hisoboti (akademik yil sozlanmagan bo'lsa) yiqilmasin — seksiya shunchaki chiqmaydi.
          }
        })(),
      );
    }

    // ─── Oylik fondi + tasdiq kutayotganlar ─────────────────────────────────
    if (can(AppPermission.HR_PAYROLLS_READ)) {
      tasks.push(
        (async () => {
          const period = today.slice(0, 7);
          const fundQb = this.payrolls
            .createQueryBuilder('pr')
            .select('COALESCE(SUM(pr.net_amount), 0)', 'sum')
            .where('pr.deleted_at IS NULL')
            .andWhere('pr.period = :period', { period });
          applyTenantScope(fundQb, 'pr', this.tenant, { branch: true });
          const fund = await fundQb.getRawOne<{ sum: string }>();
          result.payrollFund = { thisMonth: Number(fund?.sum ?? 0) };

          const pending = await this.payrolls.count({
            where: tenantWhere<Payroll>(this.tenant, { status: PayrollStatus.PENDING_APPROVAL }, { branch: true }),
          });
          if (pending > 0) result.actionCenter.push({ key: 'pending_payrolls', count: pending });
        })(),
      );
    }

    // ─── Lidlar (qabul) ─────────────────────────────────────────────────────
    if (can(AppPermission.CRM_LEADS_READ)) {
      tasks.push(
        (async () => {
          const weekQb = this.leads
            .createQueryBuilder('l')
            .select("to_char(date_trunc('week', l.created_at), 'YYYY-MM-DD')", 'wk')
            .addSelect('COUNT(*)', 'cnt')
            .where('l.deleted_at IS NULL')
            .andWhere("l.created_at >= (CURRENT_DATE - INTERVAL '8 weeks')")
            .groupBy('wk')
            .orderBy('wk', 'ASC');
          applyTenantScope(weekQb, 'l', this.tenant, { branch: true });
          const weeks = await weekQb.getRawMany<{ wk: string; cnt: string }>();
          const spark = weeks.map((w) => Number(w.cnt));

          // Avval 4 ta alohida COUNT + 1 ta "eskirgan" hisoblovchi (5 so'rov)
          // edi — endi bitta qatorda 5 ta FILTER'langan agregat (T-07).
          const countsQb = this.leads
            .createQueryBuilder('l')
            .select('COUNT(*)', 'total')
            .addSelect("COUNT(*) FILTER (WHERE l.created_at >= date_trunc('week', CURRENT_DATE))", 'newThisWeek')
            .addSelect(
              "COUNT(*) FILTER (WHERE l.created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days' AND l.created_at < date_trunc('week', CURRENT_DATE))",
              'prevWeek',
            )
            .addSelect('COUNT(*) FILTER (WHERE l.status = :contract)', 'contracts')
            .addSelect(
              "COUNT(*) FILTER (WHERE l.status = :new AND l.created_at < (NOW() - INTERVAL '48 hours'))",
              'stale',
            )
            .where('l.deleted_at IS NULL')
            .setParameters({ contract: LeadStatus.CONTRACT, new: LeadStatus.NEW });
          applyTenantScope(countsQb, 'l', this.tenant, { branch: true });
          const counts = await countsQb.getRawOne<{
            total: string;
            newThisWeek: string;
            prevWeek: string;
            contracts: string;
            stale: string;
          }>();
          const total = Number(counts?.total ?? 0);
          const contracts = Number(counts?.contracts ?? 0);
          result.leads = {
            newThisWeek: Number(counts?.newThisWeek ?? 0),
            prevWeek: Number(counts?.prevWeek ?? 0),
            conversionRate: total > 0 ? Math.round((contracts / total) * 1000) / 10 : null,
            spark,
          };

          // 48 soatdan beri "yangi" holatda qolgan lidlar — qabul bo'limi ogohlantirishi.
          const stale = Number(counts?.stale ?? 0);
          if (stale > 0) result.actionCenter.push({ key: 'stale_leads', count: stale });
        })(),
      );

      // Grafik: voronka — har holatdagi lidlar soni (kanban tartibida).
      tasks.push(
        (async () => {
          const qb = this.leads
            .createQueryBuilder('l')
            .select('l.status', 'status')
            .addSelect('COUNT(*)', 'cnt')
            .where('l.deleted_at IS NULL')
            .groupBy('l.status');
          applyTenantScope(qb, 'l', this.tenant, { branch: true });
          const rows = await qb.getRawMany<{ status: string; cnt: string }>();
          const by = new Map(rows.map((r) => [r.status, Number(r.cnt)]));
          const order = [
            LeadStatus.NEW,
            LeadStatus.CONTACTED,
            LeadStatus.INTERESTED,
            LeadStatus.TRIAL_LESSON,
            LeadStatus.CONTRACT,
            LeadStatus.REJECTED,
          ];
          result.leadFunnel = order.map((status) => ({ status, count: by.get(status) ?? 0 }));
        })(),
      );
    }

    // ─── Diqqat markazi: tasdiqlanmagan sessiyalar ──────────────────────────
    if (can(AppPermission.ATTENDANCE_RECORDS_READ)) {
      tasks.push(
        (async () => {
          const qb = this.sessions
            .createQueryBuilder('cs')
            .where('cs.deleted_at IS NULL')
            .andWhere('cs.date <= :today AND cs.date >= (CURRENT_DATE - INTERVAL \'7 days\')', { today })
            .andWhere('cs.status IN (:...sts)', { sts: [SessionStatus.SCHEDULED, SessionStatus.OPEN] });
          applyTenantScope(qb, 'cs', this.tenant, { branch: true });
          const count = await qb.getCount();
          if (count > 0) result.actionCenter.push({ key: 'unconfirmed_sessions', count });
        })(),
      );

      // BUGUN paneli: bugungi sessiyalar holati (o'tildi/bekor/kutmoqda).
      tasks.push(
        (async () => {
          const qb = this.sessions
            .createQueryBuilder('cs')
            .select('cs.status', 'status')
            .addSelect('COUNT(*)', 'cnt')
            .where('cs.deleted_at IS NULL')
            .andWhere('cs.date = :today', { today })
            .groupBy('cs.status');
          applyTenantScope(qb, 'cs', this.tenant, { branch: true });
          const rows = await qb.getRawMany<{ status: SessionStatus; cnt: string }>();
          const by = new Map(rows.map((r) => [r.status, Number(r.cnt)]));
          const confirmed = by.get(SessionStatus.CONFIRMED) ?? 0;
          const cancelled = by.get(SessionStatus.CANCELLED) ?? 0;
          const pending = (by.get(SessionStatus.SCHEDULED) ?? 0) + (by.get(SessionStatus.OPEN) ?? 0);
          result.sessionsToday = { total: confirmed + cancelled + pending, confirmed, cancelled, pending };
        })(),
      );

      // Grafik: oxirgi 30 kun bo'yicha "keldi" soni → foiz (aktiv o'quvchilarga nisbatan).
      tasks.push(
        (async () => {
          const qb = this.attendance
            .createQueryBuilder('ar')
            .select("to_char(ar.date, 'YYYY-MM-DD')", 'd')
            .addSelect(
              `COUNT(*) FILTER (WHERE ar.status IN ('present', 'late', 'left_early', 'excused'))`,
              'came',
            )
            .where('ar.deleted_at IS NULL')
            .andWhere("ar.date >= (CURRENT_DATE - INTERVAL '29 days')")
            .groupBy('d')
            .orderBy('d', 'ASC');
          applyTenantScope(qb, 'ar', this.tenant, { branch: true });
          const rows = await qb.getRawMany<{ d: string; came: string }>();
          const byDate = new Map(rows.map((r) => [r.d, Number(r.came)]));
          const totalActive = await activeStudentCount();
          const trend: Array<{ date: string; came: number; pct: number | null }> = [];
          for (let i = 29; i >= 0; i -= 1) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const iso = isoDate(d);
            const came = byDate.get(iso);
            trend.push({
              date: iso,
              came: came ?? 0,
              pct: came !== undefined && totalActive > 0 ? Math.round((came / totalActive) * 100) : null,
            });
          }
          result.attendanceTrend = trend;
        })(),
      );

      // BUGUN paneli: kelmaganlarning birinchi 8 ta ismi (tez ko'z yugurtirish uchun).
      tasks.push(
        (async () => {
          const qb = this.attendance
            .createQueryBuilder('ar')
            .leftJoin('ar.student', 'st')
            .select("CONCAT(st.last_name, ' ', st.first_name)", 'name')
            .where('ar.deleted_at IS NULL')
            .andWhere('ar.date = :today', { today })
            .andWhere('ar.status = :absent', { absent: AttendanceStatus.ABSENT })
            .orderBy('st.last_name', 'ASC')
            .limit(8);
          applyTenantScope(qb, 'ar', this.tenant, { branch: true });
          const rows = await qb.getRawMany<{ name: string }>();
          result.absentPreview = rows.map((r) => (r.name ?? '').trim()).filter(Boolean);
        })(),
      );
    }

    // ─── BUGUN paneli: bugungi to'lovlar ────────────────────────────────────
    if (can(AppPermission.FINANCE_READ)) {
      tasks.push(
        (async () => {
          const qb = this.payments
            .createQueryBuilder('sp')
            .select('COUNT(*)', 'cnt')
            .addSelect('COALESCE(SUM(sp.amount), 0)', 'sum')
            .where('sp.deleted_at IS NULL')
            .andWhere('sp.payment_date = :today', { today });
          applyTenantScope(qb, 'sp', this.tenant, { branch: true });
          const row = await qb.getRawOne<{ cnt: string; sum: string }>();
          result.paymentsToday = { count: Number(row?.cnt ?? 0), amount: Number(row?.sum ?? 0) };
        })(),
      );
    }

    // ─── Diqqat markazi: tugayotgan sertifikatlar (30 kun) ──────────────────
    if (can(AppPermission.HR_STAFF_CERTIFICATES_READ)) {
      tasks.push(
        (async () => {
          const qb = this.certificates
            .createQueryBuilder('sc')
            .where('sc.deleted_at IS NULL')
            .andWhere("sc.expires_at IS NOT NULL AND sc.expires_at BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')");
          applyTenantScope(qb, 'sc', this.tenant, { branch: true });
          const count = await qb.getCount();
          if (count > 0) result.actionCenter.push({ key: 'expiring_certificates', count });
        })(),
      );
    }

    // ─── FAQAT EGA: filiallar taqqoslash + oxirgi faoliyat ──────────────────
    if (isOwner) {
      tasks.push(this.buildBranchComparison(result, today, year, month));
      tasks.push(
        (async () => {
          // DIQQAT: join+take bilan orderBy'da xom ustun emas, entity xususiyati
          // bo'lishi shart (aks holda TypeORM "databaseName" xatosi beradi).
          const qb = this.auditLogs
            .createQueryBuilder('al')
            .leftJoinAndSelect('al.user', 'u')
            .where('al.deleted_at IS NULL')
            .orderBy('al.createdAt', 'DESC')
            .take(10);
          applyTenantScope(qb, 'al', this.tenant, { branch: false });
          const rows = await qb.getMany();
          result.recentActivity = rows.map((r) => ({
            at: r.createdAt.toISOString(),
            actor: r.user ? `${r.user.lastName ?? ''} ${r.user.firstName ?? ''}`.trim() || null : null,
            action: r.action,
            entity: r.entity,
          }));
        })(),
      );
    }

    await Promise.all(tasks);
    // Barqaror tartib (parallel push tasodifiy tartib beradi).
    const order = ['unconfirmed_sessions', 'pending_payrolls', 'debtors', 'stale_leads', 'expiring_certificates'];
    result.actionCenter.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

    this.cache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  }

  /**
   * Filiallar taqqoslash jadvali (ega uchun) — filial tanlovidan qat'i nazar
   * BUTUN maktab bo'yicha, filial kesimida guruhlanadi (branch filtri o'chiq).
   */
  private async buildBranchComparison(
    result: DashboardOverview,
    today: string,
    year: number,
    month: number,
  ): Promise<void> {
    const branchList = await this.branches.find({
      where: tenantWhere<Branch>(this.tenant, {}, { branch: false }),
    });
    if (branchList.length === 0) return; // filialsiz maktab — jadval shart emas

    const groupCount = async <T extends { filialId?: string | null }>(
      repo: Repository<T>,
      alias: string,
      extraWhere: string,
      params: Record<string, unknown> = {},
    ): Promise<Map<string | null, number>> => {
      const qb = repo
        .createQueryBuilder(alias)
        .select(`${alias}.filial_id`, 'fid')
        .addSelect('COUNT(*)', 'cnt')
        .where(`${alias}.deleted_at IS NULL`)
        .andWhere(extraWhere, params)
        .groupBy(`${alias}.filial_id`);
      applyTenantScope(qb, alias, this.tenant, { branch: false });
      const rows = await qb.getRawMany<{ fid: string | null; cnt: string }>();
      return new Map(rows.map((r) => [r.fid, Number(r.cnt)]));
    };

    const [studentsBy, cameBy, leadsBy, revenueRows] = await Promise.all([
      groupCount(this.students, 'st', 'st.status = :active', { active: StudentStatus.ACTIVE }),
      groupCount(this.attendance, 'ar', "ar.date = :today AND ar.status IN ('present', 'late', 'left_early', 'excused')", { today }),
      groupCount(this.leads, 'l', "l.created_at >= date_trunc('week', CURRENT_DATE)"),
      (async () => {
        const qb = this.payments
          .createQueryBuilder('sp')
          .select('sp.filial_id', 'fid')
          .addSelect('COALESCE(SUM(sp.amount), 0)', 'sum')
          .where('sp.deleted_at IS NULL')
          .andWhere('sp.year = :y AND sp.month = :m', { y: year, m: month })
          .groupBy('sp.filial_id');
        applyTenantScope(qb, 'sp', this.tenant, { branch: false });
        return qb.getRawMany<{ fid: string | null; sum: string }>();
      })(),
    ]);
    const revenueBy = new Map(revenueRows.map((r) => [r.fid, Number(r.sum)]));

    const rows = branchList.map((b) => {
      const students = studentsBy.get(b.id) ?? 0;
      const came = cameBy.get(b.id) ?? 0;
      return {
        id: b.id as string | null,
        name: localizedName(b.name),
        students,
        revenueThisMonth: revenueBy.get(b.id) ?? 0,
        cameToday: came,
        attendancePct: students > 0 && came > 0 ? Math.round((came / students) * 100) : null,
        leadsWeek: leadsBy.get(b.id) ?? 0,
      };
    });

    // Filialga biriktirilmagan yozuvlar bo'lsa — alohida qator.
    const unassigned = {
      students: studentsBy.get(null) ?? 0,
      revenue: revenueBy.get(null) ?? 0,
      came: cameBy.get(null) ?? 0,
      leads: leadsBy.get(null) ?? 0,
    };
    if (unassigned.students + unassigned.revenue + unassigned.leads > 0) {
      rows.push({
        id: null,
        name: 'Filialsiz',
        students: unassigned.students,
        revenueThisMonth: unassigned.revenue,
        cameToday: unassigned.came,
        attendancePct:
          unassigned.students > 0 && unassigned.came > 0
            ? Math.round((unassigned.came / unassigned.students) * 100)
            : null,
        leadsWeek: unassigned.leads,
      });
    }

    rows.sort((a, b) => b.students - a.students);
    result.branches = rows;
  }
}

// ─── Yordamchilar ───────────────────────────────────────────────────────────

/** LocalizedText jsonb ({uz, ru, en}) → ko'rsatiladigan nom. */
function localizedName(name: unknown): string {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') {
    const o = name as Record<string, string>;
    return o.uz ?? o.ru ?? o.en ?? Object.values(o)[0] ?? '—';
  }
  return '—';
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** {ym→cnt} qatorlarini oxirgi N oylik zich seriyaga aylantiradi. */
function lastMonthsSeries(rows: Array<{ ym: string; cnt: string }>, n: number, year: number, month: number): number[] {
  const by = new Map(rows.map((r) => [r.ym, Number(r.cnt)]));
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    out.push(by.get(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`) ?? 0);
  }
  return out;
}
