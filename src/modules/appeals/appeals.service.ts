import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Between, Brackets, Repository } from 'typeorm';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { AppealPeriodFilter, AppealQueryDto } from './dto/appeal-query.dto';
import { PublicCreateAppealDto } from './dto/public-create-appeal.dto';
import { UpdateAppealDto } from './dto/update-appeal.dto';
import { Appeal, AppealSource, AppealStatus, AppealType } from './entities/appeal.entity';
import { AppealPublicLink } from './entities/appeal-public-link.entity';
import { AppealListResponseSchema, AppealResponseSchema } from './swagger/appeal-response.schema';
import {
  AppealPublicLinkSchema,
  PublicAppealLinkInfoSchema,
} from './swagger/appeal-public-link.schema';

@Injectable()
export class AppealsService {
  constructor(
    @InjectRepository(Appeal)
    private readonly appealRepository: Repository<Appeal>,
    @InjectRepository(AppealPublicLink)
    private readonly publicLinkRepository: Repository<AppealPublicLink>,
    private readonly configService: ConfigService,
  ) {}

  // ---- Public link management (authed) ----

  async getPublicLink(): Promise<AppealPublicLinkSchema> {
    const link = await this.publicLinkRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    if (!link) {
      return { token: null, url: null, active: false };
    }
    return { token: link.token, url: this.buildPublicUrl(link.token), active: true };
  }

  /** Rotates the active link: deactivates any existing one and issues a fresh token. */
  async createPublicLink(createdById?: string): Promise<AppealPublicLinkSchema> {
    await this.publicLinkRepository.update({ isActive: true }, { isActive: false });
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

  async create(dto: CreateAppealDto): Promise<AppealResponseSchema> {
    const appeal = this.appealRepository.create({
      fullName: this.normalizeText(dto.fullName),
      phone: this.normalizePhone(dto.phone),
      type: dto.type,
      targetRole: dto.targetRole,
      description: this.normalizeText(dto.description),
      source: dto.source ?? AppealSource.PUBLIC_LINK,
      status: dto.status ?? AppealStatus.PENDING,
    });

    return this.toResponseDto(await this.appealRepository.save(appeal));
  }

  async findAll(query: Partial<AppealQueryDto> = {}): Promise<AppealListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.appealRepository.createQueryBuilder('appeal').where('1 = 1');
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
      this.appealRepository.count(),
      this.appealRepository.count({ where: { type: AppealType.SUGGESTION } }),
      this.appealRepository.count({ where: { type: AppealType.COMPLAINT } }),
      this.appealRepository.count({
        where: { createdAt: Between(monthRange.from, monthRange.to) },
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

  async update(id: string, dto: UpdateAppealDto): Promise<AppealResponseSchema> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one appeal field must be provided');
    }

    const appeal = await this.findAppealEntity(id);

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
    if (dto.status !== undefined) {
      appeal.status = dto.status;
    }

    return this.toResponseDto(await this.appealRepository.save(appeal));
  }

  async remove(id: string): Promise<void> {
    await this.findAppealEntity(id);
    await this.appealRepository.softDelete(id);
  }

  private async findAppealEntity(id: string): Promise<Appeal> {
    const appeal = await this.appealRepository.findOne({ where: { id } });

    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    return appeal;
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
