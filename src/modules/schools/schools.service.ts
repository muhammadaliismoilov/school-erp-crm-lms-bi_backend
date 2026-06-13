import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, ILike, Not, Repository } from 'typeorm';
import type { FindOptionsWhere, SelectQueryBuilder } from 'typeorm';
import { CommonStatus } from '../../common/enums/common-status.enum';
import type { LocalizedText } from '../../common/i18n/locale';
import { School } from '../settings/entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { GroupMonthlyPaymentDto } from './dto/group-monthly-payment.dto';
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

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schools: Repository<School>,
  ) {}

  async createSchool(dto: CreateSchoolDto): Promise<SchoolResponseDto> {
    const input = this.buildSchoolInput(dto);
    this.validateCapacities(input);
    await this.ensureSchoolCanBeSaved(input);

    const school = await this.schools.save(this.schools.create(input));

    return this.toSchoolResponse(school);
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

    return this.toSchoolResponse(await this.schools.save(school));
  }

  async deleteSchool(id: string): Promise<void> {
    await this.findSchoolEntity(id);
    await this.schools.softDelete(id);
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
    const baseWhere: FindOptionsWhere<School> = {
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
}
