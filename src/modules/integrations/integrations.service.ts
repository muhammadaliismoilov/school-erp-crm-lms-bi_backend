import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { IntegrationQueryDto } from './dto/integration-query.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import {
  Integration,
  IntegrationCode,
  OpenAiModel,
} from './entities/integration.entity';
import { IntegrationListResponseSchema, IntegrationResponseSchema } from './swagger/integration-response.schema';

type IntegrationConfig = Record<string, unknown>;

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
  ) {}

  async create(dto: CreateIntegrationDto): Promise<IntegrationResponseSchema> {
    const code = this.normalizeCode(dto.code);
    await this.ensureCodeIsAvailable(code);
    const config = this.normalizeConfig(code, dto.config);
    const integration = this.integrationRepository.create({
      name: this.normalizeText(dto.name),
      code,
      description: this.nullableText(dto.description),
      category: dto.category,
      isEnabled: dto.isEnabled ?? false,
      config,
    });

    return this.toResponseDto(await this.integrationRepository.save(integration));
  }

  async findAll(query: Partial<IntegrationQueryDto> = {}): Promise<IntegrationListResponseSchema> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.integrationRepository.createQueryBuilder('integration').where('1 = 1');
    const search = this.nullableText(query.search);

    if (search) {
      qb.andWhere(
        new Brackets((whereQb) => {
          whereQb
            .where('integration.name ILIKE :search', { search: '%' + search + '%' })
            .orWhere('integration.code ILIKE :search', { search: '%' + search + '%' })
            .orWhere('integration.description ILIKE :search', { search: '%' + search + '%' })
            .orWhere('integration.category ILIKE :search', { search: '%' + search + '%' });
        }),
      );
    }

    if (query.category) {
      qb.andWhere('integration.category = :category', { category: query.category });
    }

    if (query.isEnabled !== undefined) {
      qb.andWhere('integration.is_enabled = :isEnabled', { isEnabled: query.isEnabled });
    }

    const [items, total] = await qb
      .orderBy('integration.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const [totalCount, connectedCount] = await Promise.all([
      this.integrationRepository.count(),
      this.integrationRepository.count({ where: { isEnabled: true } }),
    ]);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      meta: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit) || 1,
      },
      stats: {
        totalCount,
        connectedCount,
      },
    };
  }

  async findOne(id: string): Promise<IntegrationResponseSchema> {
    return this.toResponseDto(await this.findIntegrationEntity(id));
  }

  async update(id: string, dto: UpdateIntegrationDto): Promise<IntegrationResponseSchema> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one integration field must be provided');
    }

    const integration = await this.findIntegrationEntity(id);
    const nextCode = dto.code !== undefined ? this.normalizeCode(dto.code) : this.normalizeCode(integration.code);

    if (dto.code !== undefined && nextCode !== integration.code) {
      await this.ensureCodeIsAvailable(nextCode, id);
      integration.code = nextCode;
    }

    if (dto.name !== undefined) {
      integration.name = this.normalizeText(dto.name);
    }
    if (dto.description !== undefined) {
      integration.description = this.nullableText(dto.description);
    }
    if (dto.category !== undefined) {
      integration.category = dto.category;
    }
    if (dto.isEnabled !== undefined) {
      integration.isEnabled = dto.isEnabled;
    }
    if (dto.config !== undefined || dto.code !== undefined) {
      integration.config = this.normalizeConfig(
        nextCode,
        this.mergeConfig(integration.config ?? {}, dto.config ?? {}),
      );
    }

    return this.toResponseDto(await this.integrationRepository.save(integration));
  }

  async remove(id: string): Promise<void> {
    await this.findIntegrationEntity(id);
    await this.integrationRepository.softDelete(id);
  }

  private async findIntegrationEntity(id: string): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({ where: { id } });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return integration;
  }

  private async ensureCodeIsAvailable(code: IntegrationCode, excludeIntegrationId?: string): Promise<void> {
    const existing = await this.integrationRepository.findOne({
      where: {
        code,
        ...(excludeIntegrationId ? { id: Not(excludeIntegrationId) } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Integration code already exists');
    }
  }

  private normalizeConfig(code: IntegrationCode, config: IntegrationConfig): IntegrationConfig {
    if (!this.isPlainRecord(config)) {
      throw new BadRequestException('Integration config is invalid');
    }

    if (code === IntegrationCode.OPENAI) {
      return this.normalizeOpenAiConfig(config);
    }

    if (code === IntegrationCode.ONLINE_PBX) {
      return this.normalizeOnlinePbxConfig(config);
    }

    throw new BadRequestException('Integration config is invalid');
  }

  private normalizeOpenAiConfig(config: IntegrationConfig): IntegrationConfig {
    const apiKey = this.requiredText(config.apiKey);
    const model = this.optionalText(config.model) ?? OpenAiModel.GPT_4O_MINI;

    if (!apiKey.startsWith('sk-') || !Object.values(OpenAiModel).includes(model as OpenAiModel)) {
      throw new BadRequestException('Integration config is invalid');
    }

    return {
      ...config,
      apiKey,
      model,
      enabled: typeof config.enabled === 'boolean' ? config.enabled : true,
    };
  }

  private normalizeOnlinePbxConfig(config: IntegrationConfig): IntegrationConfig {
    const domain = this.requiredText(config.domain);
    const apiKey = this.requiredText(config.apiKey);
    const webhookSecret = this.requiredText(config.webhookSecret);
    const widgetScriptUrl = this.optionalText(config.widgetScriptUrl);

    if (widgetScriptUrl && !this.isValidUrl(widgetScriptUrl)) {
      throw new BadRequestException('Integration config is invalid');
    }

    return {
      ...config,
      domain,
      apiKey,
      webhookSecret,
      phoneNumbers: this.normalizePhoneNumbers(config.phoneNumbers),
      ...(widgetScriptUrl ? { widgetScriptUrl } : {}),
    };
  }

  private mergeConfig(existing: IntegrationConfig, incoming: IntegrationConfig): IntegrationConfig {
    const merged = { ...existing, ...incoming };

    for (const key of ['apiKey', 'webhookSecret', 'accessToken', 'refreshToken']) {
      if (
        typeof incoming[key] === 'string' &&
        incoming[key].includes('...') &&
        typeof existing[key] === 'string'
      ) {
        merged[key] = existing[key];
      }
    }

    return merged;
  }

  private toResponseDto(integration: Integration): IntegrationResponseSchema {
    return {
      id: integration.id,
      name: integration.name,
      code: integration.code,
      description: integration.description,
      category: integration.category,
      isEnabled: integration.isEnabled,
      config: this.maskSecrets(integration.config ?? {}),
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      deletedAt: integration.deletedAt,
      version: integration.version,
    };
  }

  private maskSecrets(config: IntegrationConfig): IntegrationConfig {
    return Object.fromEntries(
      Object.entries(config).map(([key, value]) => [
        key,
        this.isSecretKey(key) && typeof value === 'string' ? this.maskSecret(value) : value,
      ]),
    );
  }

  private maskSecret(value: string): string {
    const normalized = value.trim();
    if (normalized.length <= 8) {
      return '********';
    }

    return normalized.slice(0, 7) + '...' + normalized.slice(-4);
  }

  private isSecretKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return (
      normalized.includes('apikey') ||
      normalized.includes('secret') ||
      normalized.includes('token') ||
      normalized === 'password'
    );
  }

  private normalizeCode(value: IntegrationCode | string): IntegrationCode {
    const code = String(value).trim().toLowerCase() as IntegrationCode;
    if (!Object.values(IntegrationCode).includes(code)) {
      throw new BadRequestException('Integration config is invalid');
    }

    return code;
  }

  private normalizePhoneNumbers(value: unknown): string[] {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    const items = Array.isArray(value) ? value : String(value).split(',');
    const phones = items.map((item) => String(item).replace(/[\s()-]/g, '')).filter(Boolean);

    if (phones.some((phone) => !/^\+998\d{9}$/.test(phone))) {
      throw new BadRequestException('Integration config is invalid');
    }

    return phones;
  }

  private requiredText(value: unknown): string {
    const text = this.optionalText(value);
    if (!text) {
      throw new BadRequestException('Integration config is invalid');
    }

    return text;
  }

  private optionalText(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }

  private isPlainRecord(value: unknown): value is IntegrationConfig {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
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
}
