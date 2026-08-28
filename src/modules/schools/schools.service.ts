import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, ILike, Not, Repository } from 'typeorm';
import type { FindOptionsWhere, SelectQueryBuilder } from 'typeorm';
import { CommonStatus } from '../../common/enums/common-status.enum';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { SchoolModulesService } from './school-modules.service';
import { GATED_MODULE_KEYS } from './gated-modules';
import { SetSchoolModuleDto } from './dto/set-school-module.dto';
import type { LocalizedText } from '../../common/i18n/locale';
import { School } from '../settings/entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { GroupMonthlyPaymentDto } from './dto/group-monthly-payment.dto';
import { ResolveSchoolResponseDto } from './dto/resolve-school-response.dto';
import { SchoolQueryDto } from './dto/school-query.dto';
import { SchoolListResponseDto, SchoolResponseDto, SchoolStatsDto } from './dto/school-response.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { PaymentPeriodUnit, PaymentStartStrategy, SchoolType, WorkDays } from './enums/school.enums';

interface SchoolSaveInput {
  name: LocalizedText;
  normalizedName: string;
  legalName?: string | null;
  country: string;
  region?: string | null;
  district?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  schoolType: SchoolType;
  contactEmail?: string | null;
  contactPhone?: string | null;
  monthlyPayment: number;
  paymentStartStrategy: PaymentStartStrategy;
  paymentPeriodUnit: PaymentPeriodUnit;
  workDays: WorkDays;
  separateGroupPayments: boolean;
  groupMonthlyPayments: GroupMonthlyPaymentDto[];
  totalCapacity: number;
  elementaryCapacity: number;
  upperCapacity: number;
  logoFileId?: string | null;
  logoUrl?: string | null;
  status: CommonStatus;
}

interface HostnameCacheEntry {
  subdomain: string;
  schoolId: string;
  schoolName: string;
  logoUrl: string | null;
}

@Injectable()
export class SchoolsService {
  private static readonly HOSTNAME_CACHE_TTL_MS = 5 * 60 * 1000;
  private hostnameCache: { expiresAt: number; entries: HostnameCacheEntry[] } | null = null;

  constructor(
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    private readonly tenant: TenantContextService,
    private readonly moduleRegistry: SchoolModulesService,
  ) {}

  /**
   * Aktiv maktabda qaysi modullar yoqilgan — yon panel shu javobga qarab
   * bo'limlarni ko'rsatadi.
   *
   * Maktab konteksti yo'q bo'lsa (global CEO "Barcha maktablar" da) hammasi
   * o'chiq deb qaytariladi: modul har doim aniq bir maktabga tegishli, "hamma
   * maktab uchun birdaniga" degan holat yo'q.
   */
  async myModules(): Promise<Record<string, boolean>> {
    const schoolId = this.tenantSchoolId();
    if (!schoolId) {
      return Object.fromEntries(GATED_MODULE_KEYS.map((key) => [key, false]));
    }
    return this.moduleRegistry.statusFor(schoolId);
  }

  /** CEO uchun: bitta maktabning modul holati. */
  async modulesOfSchool(schoolId: string): Promise<Record<string, boolean>> {
    await this.findSchoolEntity(schoolId);
    return this.moduleRegistry.statusFor(schoolId);
  }

  /** CEO uchun: modulni yoqish/o'chirish. */
  async setSchoolModule(
    schoolId: string,
    dto: SetSchoolModuleDto,
    actorId?: string | null,
  ): Promise<Record<string, boolean>> {
    await this.findSchoolEntity(schoolId);
    await this.moduleRegistry.set(schoolId, dto.module, dto.enabled, actorId);
    return this.moduleRegistry.statusFor(schoolId);
  }

  /**
   * Aktiv maktab — `School` uchun tenant kaliti `school_id` EMAS, `id` ning
   * o'zi: maktab jadvali ijarachining o'zi.
   *
   * `null` qaytsa (global CEO `admin.*` da, yoki login paytida — u yerda hali
   * foydalanuvchi yo'q) filtr qo'llanmaydi va hammasi ko'rinadi. Aynan shu
   * sabab login'dagi maktab nomi qidiruvi ishlayveradi.
   */
  private tenantSchoolId(): string | null {
    return this.tenant.getSchoolId();
  }

  async createSchool(dto: CreateSchoolDto): Promise<SchoolResponseDto> {
    const input = this.buildSchoolInput(dto);
    this.validateCapacities(input);
    await this.ensureSchoolCanBeSaved(input);

    const school = await this.schools.save(this.schools.create(input));
    this.invalidateHostnameCache();

    return this.toSchoolResponse(school);
  }

  /**
   * Subdomain-tenant login (frontend/middleware.ts, auth.service.ts) buni
   * hostname qaysi maktabga tegishli ekanini aniqlash uchun chaqiradi.
   * `website_url` maydonidan ajratib olinadi, alohida subdomain ustuni yo'q
   * (kelishilgan qaror). Solishtirish FAQAT birinchi label (subdomain)
   * bo'yicha — root domendan qat'i nazar (`elegantschool.crm.uz` va
   * `elegantschool.localhost` bir xil "elegantschool" labeliga tushadi),
   * shunday qilib lokal/staging muhitlar production DB yozuvlari bilan ham
   * ishlaydi.
   */
  async resolveByHostname(hostname: string): Promise<ResolveSchoolResponseDto | null> {
    const label = this.extractSubdomainLabel(hostname);
    if (!label) {
      return null;
    }

    const entries = await this.getHostnameCacheEntries();
    const match = entries.find((entry) => entry.subdomain === label);

    if (!match) {
      return null;
    }

    return { schoolId: match.schoolId, schoolName: match.schoolName, logoUrl: match.logoUrl };
  }

  async findSchools(query: SchoolQueryDto = {}): Promise<SchoolListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildSchoolWhere(query);
    const [schools, total] = await this.schools.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { normalizedName: 'ASC', createdAt: 'ASC' },
    });
    const stats = await this.aggregateStats(query);

    return {
      stats,
      items: schools.map((school) => this.toSchoolResponse(school)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findSchool(id: string): Promise<SchoolResponseDto> {
    return this.toSchoolResponse(await this.findSchoolEntity(id));
  }

  async updateSchool(id: string, dto: UpdateSchoolDto): Promise<SchoolResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one school field must be provided');
    }

    const school = await this.findSchoolEntity(id);
    const input = this.buildSchoolInput(
      {
        name: dto.name ?? school.name?.uz ?? '',
        legalName: dto.legalName ?? school.legalName ?? undefined,
        country: dto.country ?? school.country ?? 'UZ',
        region: dto.region ?? school.region ?? undefined,
        district: dto.district ?? school.district ?? undefined,
        address: dto.address ?? school.address ?? undefined,
        websiteUrl: dto.websiteUrl ?? school.websiteUrl ?? undefined,
        schoolType: dto.schoolType ?? school.schoolType ?? SchoolType.GENERAL,
        email: dto.email ?? school.contactEmail ?? undefined,
        phone: dto.phone ?? school.contactPhone ?? undefined,
        monthlyPayment: dto.monthlyPayment ?? school.monthlyPayment ?? 0,
        paymentStartStrategy:
          dto.paymentStartStrategy ?? school.paymentStartStrategy ?? PaymentStartStrategy.FULL_ACADEMIC_YEAR,
        paymentPeriodUnit: dto.paymentPeriodUnit ?? school.paymentPeriodUnit ?? PaymentPeriodUnit.YEAR,
        workDays: dto.workDays ?? school.workDays ?? WorkDays.FIVE_DAYS,
        separateGroupPayments: dto.separateGroupPayments ?? school.separateGroupPayments ?? false,
        groupMonthlyPayments: dto.groupMonthlyPayments ?? school.groupMonthlyPayments ?? [],
        totalCapacity: dto.totalCapacity ?? school.totalCapacity ?? 0,
        elementaryCapacity: dto.elementaryCapacity ?? school.elementaryCapacity ?? 0,
        upperCapacity: dto.upperCapacity ?? school.upperCapacity ?? 0,
        logoFileId: dto.logoFileId ?? school.logoFileId ?? undefined,
        logoUrl: dto.logoUrl ?? school.logoUrl ?? undefined,
      },
      dto.status ?? school.status ?? CommonStatus.ACTIVE,
    );
    this.validateCapacities(input);
    await this.ensureSchoolCanBeSaved(input, id);
    Object.assign(school, input);

    const saved = await this.schools.save(school);
    this.invalidateHostnameCache();

    return this.toSchoolResponse(saved);
  }

  async deleteSchool(id: string): Promise<void> {
    await this.findSchoolEntity(id);
    await this.schools.softDelete(id);
    this.invalidateHostnameCache();
  }

  private buildSchoolInput(dto: CreateSchoolDto, status = CommonStatus.ACTIVE): SchoolSaveInput {
    const name = this.normalizeText(dto.name);

    return {
      name: { uz: name, ru: name, en: name },
      normalizedName: this.normalizeSchoolName(name),
      legalName: this.nullableText(dto.legalName),
      country: (dto.country ?? 'UZ').toUpperCase(),
      region: this.nullableText(dto.region),
      district: this.nullableText(dto.district),
      address: this.nullableText(dto.address),
      websiteUrl: this.nullableText(dto.websiteUrl),
      schoolType: dto.schoolType,
      contactEmail: this.nullableText(dto.email),
      contactPhone: this.nullableText(dto.phone),
      monthlyPayment: dto.monthlyPayment ?? 0,
      paymentStartStrategy: dto.paymentStartStrategy ?? PaymentStartStrategy.FULL_ACADEMIC_YEAR,
      paymentPeriodUnit: dto.paymentPeriodUnit ?? PaymentPeriodUnit.YEAR,
      workDays: dto.workDays ?? WorkDays.FIVE_DAYS,
      separateGroupPayments: dto.separateGroupPayments ?? false,
      groupMonthlyPayments: dto.separateGroupPayments ? dto.groupMonthlyPayments ?? [] : [],
      totalCapacity: dto.totalCapacity,
      elementaryCapacity: dto.elementaryCapacity,
      upperCapacity: dto.upperCapacity,
      logoFileId: this.nullableText(dto.logoFileId),
      logoUrl: this.nullableText(dto.logoUrl),
      status,
    };
  }

  private buildSchoolWhere(query: SchoolQueryDto): FindOptionsWhere<School> | FindOptionsWhere<School>[] {
    // Maktab konteksti bo'lsa ro'yxat FAQAT o'sha maktabdan iborat: ilgari
    // filtr umuman yo'q edi va maktab direktori barcha maktablarni ko'rardi.
    const tenantSchoolId = this.tenantSchoolId();
    const baseWhere: FindOptionsWhere<School> = {
      ...(tenantSchoolId ? { id: tenantSchoolId } : {}),
      ...(query.schoolType ? { schoolType: query.schoolType } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const search = query.search ? this.normalizeText(query.search) : undefined;

    if (!search) {
      return baseWhere;
    }

    return [
      { ...baseWhere, normalizedName: ILike('%' + this.normalizeSchoolName(search) + '%') },
      { ...baseWhere, legalName: ILike('%' + search + '%') },
      { ...baseWhere, address: ILike('%' + search + '%') },
      { ...baseWhere, contactPhone: ILike('%' + search + '%') },
    ];
  }

  private async ensureSchoolCanBeSaved(input: SchoolSaveInput, excludeSchoolId?: string): Promise<void> {
    const duplicateSchool = await this.schools.findOne({
      where: {
        normalizedName: input.normalizedName,
        ...(excludeSchoolId ? { id: Not(excludeSchoolId) } : {}),
      },
    });

    if (duplicateSchool) {
      throw new ConflictException('School already exists');
    }
  }

  private validateCapacities(input: Pick<SchoolSaveInput, 'totalCapacity' | 'elementaryCapacity' | 'upperCapacity'>): void {
    if (input.elementaryCapacity + input.upperCapacity !== input.totalCapacity) {
      throw new BadRequestException('School capacity sections must equal total capacity');
    }
  }

  private async findSchoolEntity(id: string): Promise<School> {
    // Begona maktab so'ralsa "topilmadi" — mavjudligini ham oshkor qilmaymiz.
    // `findSchool`/`updateSchool`/`deleteSchool` shu yerdan o'tadi, ya'ni
    // bitta tekshiruv uchtasini ham qamrab oladi.
    const tenantSchoolId = this.tenantSchoolId();
    if (tenantSchoolId && tenantSchoolId !== id) {
      throw new NotFoundException('School not found');
    }

    const school = await this.schools.findOne({ where: { id } });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }

  private async aggregateStats(query: SchoolQueryDto): Promise<SchoolStatsDto> {
    const raw = await this.applySchoolFilters(this.schools.createQueryBuilder('school'), query)
      .select('COUNT(school.id)', 'count')
      .addSelect('COALESCE(SUM(school.total_capacity), 0)', 'totalCapacity')
      .addSelect('COALESCE(SUM(school.monthly_payment), 0)', 'monthlyPaymentTotal')
      .getRawOne<{ count: string; totalCapacity: string; monthlyPaymentTotal: string }>();

    return {
      schoolCount: Number(raw?.count ?? 0),
      totalCapacity: Number(raw?.totalCapacity ?? 0),
      monthlyPaymentTotal: Number(raw?.monthlyPaymentTotal ?? 0),
    };
  }

  private applySchoolFilters(
    qb: SelectQueryBuilder<School>,
    query: SchoolQueryDto,
  ): SelectQueryBuilder<School> {
    // Statistika ham scoping'ga bo'ysunadi — aks holda direktor "Maktablar 4,
    // sig'im 2 100" degan begona jamlanmani ko'rardi.
    const tenantSchoolId = this.tenantSchoolId();
    if (tenantSchoolId) {
      qb.andWhere('school.id = :tenantSchoolId', { tenantSchoolId });
    }
    if (query.schoolType) {
      qb.andWhere('school.school_type = :schoolType', { schoolType: query.schoolType });
    }
    if (query.status) {
      qb.andWhere('school.status = :status', { status: query.status });
    }

    const search = query.search ? this.normalizeText(query.search) : undefined;
    if (search) {
      const normalizedName = '%' + this.normalizeSchoolName(search) + '%';
      const term = '%' + search + '%';
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('school.normalized_name ILIKE :normalizedName', { normalizedName })
            .orWhere('school.legal_name ILIKE :term', { term })
            .orWhere('school.address ILIKE :term', { term })
            .orWhere('school.contact_phone ILIKE :term', { term });
        }),
      );
    }

    return qb;
  }

  private toSchoolResponse(school: School): SchoolResponseDto {
    const name = this.ensureLocalizedName(school.name, school.normalizedName ?? '');

    return {
      id: school.id,
      name: name.uz,
      legalName: school.legalName ?? null,
      schoolType: school.schoolType ?? SchoolType.GENERAL,
      country: school.country ?? 'UZ',
      region: school.region ?? null,
      district: school.district ?? null,
      address: school.address ?? null,
      websiteUrl: school.websiteUrl ?? null,
      email: school.contactEmail ?? null,
      phone: school.contactPhone ?? null,
      capacities: {
        total: school.totalCapacity ?? 0,
        elementary: school.elementaryCapacity ?? 0,
        upper: school.upperCapacity ?? 0,
      },
      payment: {
        monthlyPayment: school.monthlyPayment ?? 0,
        paymentStartStrategy: school.paymentStartStrategy ?? PaymentStartStrategy.FULL_ACADEMIC_YEAR,
        paymentPeriodUnit: school.paymentPeriodUnit ?? PaymentPeriodUnit.YEAR,
        workDays: school.workDays ?? WorkDays.FIVE_DAYS,
        separateGroupPayments: school.separateGroupPayments ?? false,
        groupMonthlyPayments: school.groupMonthlyPayments ?? [],
      },
      logoUrl: school.logoUrl ?? null,
      logoFileId: school.logoFileId ?? null,
      status: school.status ?? CommonStatus.ACTIVE,
      createdAt: school.createdAt?.toISOString(),
      updatedAt: school.updatedAt?.toISOString(),
      version: school.version,
    };
  }

  private ensureLocalizedName(name: LocalizedText | undefined, fallback: string): LocalizedText {
    const uz = name?.uz || fallback;
    const ru = name?.ru || uz;
    const en = name?.en || uz;

    return { uz, ru, en };
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeSchoolName(value: string): string {
    return this.normalizeText(value).toLocaleLowerCase('uz-UZ').slice(0, 180);
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = this.normalizeText(value);
    return normalized.length > 0 ? normalized : null;
  }

  private async getHostnameCacheEntries(): Promise<HostnameCacheEntry[]> {
    const now = Date.now();
    if (this.hostnameCache && this.hostnameCache.expiresAt > now) {
      return this.hostnameCache.entries;
    }

    const activeSchools = await this.schools.find({ where: { status: CommonStatus.ACTIVE } });
    const entries = activeSchools
      .map((school) => {
        const subdomain = this.extractSubdomainLabelFromUrl(school.websiteUrl);
        if (!subdomain) {
          return null;
        }

        const name = this.ensureLocalizedName(school.name, school.normalizedName ?? '');
        return { subdomain, schoolId: school.id, schoolName: name.uz, logoUrl: school.logoUrl ?? null };
      })
      .filter((entry): entry is HostnameCacheEntry => entry !== null);

    this.hostnameCache = { expiresAt: now + SchoolsService.HOSTNAME_CACHE_TTL_MS, entries };
    return entries;
  }

  private invalidateHostnameCache(): void {
    this.hostnameCache = null;
  }

  /** `website_url` maydonidan (masalan `http://elegantschool.crm.uz`) subdomain labelini oladi. */
  private extractSubdomainLabelFromUrl(websiteUrl?: string | null): string | null {
    if (!websiteUrl) {
      return null;
    }

    try {
      const withProtocol = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`;
      return this.extractSubdomainLabel(new URL(withProtocol).hostname);
    } catch {
      return null;
    }
  }

  /**
   * Har qanday hostname'dan (port bo'lsa kesiladi) birinchi labelni oladi —
   * `www.` prefiksi bo'lsa o'tkazib yuboriladi. Root domendan qat'i nazar
   * ishlaydi: `elegantschool.crm.uz`, `elegantschool.localhost:3000` va
   * `www.elegantschool.crm.uz` barchasi "elegantschool"ga tushadi.
   */
  private extractSubdomainLabel(hostname: string): string {
    const labels = hostname.trim().toLowerCase().split(':')[0].split('.');
    if (labels[0] === 'www' && labels.length > 1) {
      return labels[1] ?? '';
    }
    return labels[0] ?? '';
  }
}
