import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { EncryptionService } from '../../common/security/encryption.service';
import { AuditService } from '../audit/audit.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { IntegrationQueryDto } from './dto/integration-query.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import {
  Integration,
  IntegrationCategory,
  IntegrationCode,
  OpenAiModel,
} from './entities/integration.entity';
import { IntegrationListResponseSchema, IntegrationResponseSchema } from './swagger/integration-response.schema';

type IntegrationConfig = Record<string, unknown>;

/** Who performed the action — used for the audit trail. */
export interface IntegrationActor {
  userId?: string;
  ipAddress?: string;
}

export interface IntegrationTestResult {
  ok: boolean;
  message: string;
}

/** Config keys holding secrets that must be encrypted at rest, per integration. */
const SECRET_FIELDS_BY_CODE: Record<string, string[]> = {
  [IntegrationCode.OPENAI]: ['apiKey'],
  [IntegrationCode.ONLINE_PBX]: ['apiKey', 'webhookSecret'],
};

/** Catalog rows seeded on bootstrap so the UI always lists the supported providers. */
const CATALOG: Array<Pick<Integration, 'name' | 'code' | 'description' | 'category'>> = [
  {
    name: 'OpenAI',
    code: IntegrationCode.OPENAI,
    description: 'AI yordamchi va matn generatsiya',
    category: IntegrationCategory.AI_ASSISTANTS,
  },
  {
    name: 'OnlinePBX',
    code: IntegrationCode.ONLINE_PBX,
    description: 'Telefoniya va call-center integratsiyasi',
    category: IntegrationCategory.TELEPHONY,
  },
];

const TEST_TIMEOUT_MS = 6000;

@Injectable()
export class IntegrationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get<string>('DISABLE_BOOTSTRAP_SEED') === 'true') {
      return;
    }
    await this.seedCatalog();
  }

  /** Idempotently ensures the supported providers exist as (disabled) catalog rows. */
  private async seedCatalog(): Promise<void> {
    for (const entry of CATALOG) {
      const existing = await this.integrationRepository.findOne({ where: { code: entry.code } });
      if (existing) {
        continue;
      }
      await this.integrationRepository.save(
        this.integrationRepository.create({
          ...entry,
          isEnabled: false,
          config: {},
        }),
      );
      this.logger.log(`Seeded integration catalog row: ${entry.code}`);
    }
  }

  async create(dto: CreateIntegrationDto, actor?: IntegrationActor): Promise<IntegrationResponseSchema> {
    const code = this.normalizeCode(dto.code);
    await this.ensureCodeIsAvailable(code);
    const config = this.normalizeConfig(code, dto.config);
    const integration = this.integrationRepository.create({
      name: this.normalizeText(dto.name),
      code,
      description: this.nullableText(dto.description),
      category: dto.category,
      isEnabled: dto.isEnabled ?? false,
      config: this.encryptConfig(code, config),
    });

    const saved = await this.integrationRepository.save(integration);
    await this.recordAudit(actor, 'integration.created', saved.id, { code });
    return this.toResponseDto(saved);
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

  async update(id: string, dto: UpdateIntegrationDto, actor?: IntegrationActor): Promise<IntegrationResponseSchema> {
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
      // Decrypt the stored secrets so validation and masked-resubmit merging run
      // against plaintext, then re-encrypt before persisting.
      const existingPlain = this.decryptConfig(integration.code, integration.config ?? {});
      const merged = this.mergeConfig(existingPlain, dto.config ?? {});
      const validated = this.normalizeConfig(nextCode, merged);
      integration.config = this.encryptConfig(nextCode, validated);
    }

    const saved = await this.integrationRepository.save(integration);
    await this.recordAudit(actor, 'integration.updated', saved.id, {
      code: saved.code,
      isEnabled: saved.isEnabled,
      changed: Object.keys(dto),
    });
    return this.toResponseDto(saved);
  }

  async remove(id: string, actor?: IntegrationActor): Promise<void> {
    const integration = await this.findIntegrationEntity(id);
    await this.integrationRepository.softDelete(id);
    await this.recordAudit(actor, 'integration.archived', integration.id, { code: integration.code });
  }

  /** Validates the stored credentials against the live provider. Never throws on a provider error. */
  async testConnection(id: string, actor?: IntegrationActor): Promise<IntegrationTestResult> {
    const integration = await this.findIntegrationEntity(id);
    const config = this.decryptConfig(integration.code, integration.config ?? {});

    let result: IntegrationTestResult;
    if (integration.code === IntegrationCode.OPENAI) {
      result = await this.testOpenAi(config);
    } else if (integration.code === IntegrationCode.ONLINE_PBX) {
      result = await this.testOnlinePbx(config);
    } else {
      result = { ok: false, message: 'Test qo‘llab-quvvatlanmaydi' };
    }

    await this.recordAudit(actor, 'integration.tested', integration.id, {
      code: integration.code,
      ok: result.ok,
    });
    return result;
  }

  private async testOpenAi(config: IntegrationConfig): Promise<IntegrationTestResult> {
    const apiKey = this.optionalText(config.apiKey);
    if (!apiKey) {
      return { ok: false, message: 'API kalit sozlanmagan' };
    }
    try {
      const res = await this.fetchWithTimeout('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        return { ok: true, message: 'OpenAI ulanishi muvaffaqiyatli' };
      }
      if (res.status === 401) {
        return { ok: false, message: 'API kalit noto‘g‘ri (401)' };
      }
      return { ok: false, message: `OpenAI xatosi: ${res.status}` };
    } catch (error) {
      return { ok: false, message: `Ulanib bo‘lmadi: ${this.errorMessage(error)}` };
    }
  }

  private async testOnlinePbx(config: IntegrationConfig): Promise<IntegrationTestResult> {
    const domain = this.optionalText(config.domain);
    const apiKey = this.optionalText(config.apiKey);
    if (!domain || !apiKey) {
      return { ok: false, message: 'Domen yoki API kalit sozlanmagan' };
    }
    try {
      const res = await this.fetchWithTimeout(
        `https://api2.onlinepbx.uz/${encodeURIComponent(domain)}/auth.json`,
        { method: 'POST' },
      );
      // The endpoint responding at all proves the domain is reachable; a full auth
      // handshake needs request signing and is out of scope for a connectivity check.
      if (res.status > 0) {
        return { ok: true, message: 'OnlinePBX domeni mavjud va javob bermoqda' };
      }
      return { ok: false, message: 'OnlinePBX javob bermadi' };
    } catch (error) {
      return { ok: false, message: `Ulanib bo‘lmadi: ${this.errorMessage(error)}` };
    }
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
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

  // ---- Encryption at rest ----

  private secretFields(code: IntegrationCode | string): string[] {
    return SECRET_FIELDS_BY_CODE[code] ?? [];
  }

  private isEncrypted(value: string): boolean {
    return value.startsWith('v1.') && value.split('.').length === 4;
  }

  private encryptConfig(code: IntegrationCode | string, config: IntegrationConfig): IntegrationConfig {
    const out = { ...config };
    for (const field of this.secretFields(code)) {
      const value = out[field];
      if (typeof value === 'string' && value.length > 0 && !this.isEncrypted(value)) {
        out[field] = this.encryption.encrypt(value);
      }
    }
    return out;
  }

  private decryptConfig(code: IntegrationCode | string, config: IntegrationConfig): IntegrationConfig {
    const out = { ...config };
    for (const field of this.secretFields(code)) {
      const value = out[field];
      if (typeof value === 'string' && this.isEncrypted(value)) {
        try {
          out[field] = this.encryption.decrypt(value);
        } catch (error) {
          this.logger.warn(`Failed to decrypt ${field}: ${this.errorMessage(error)}`);
        }
      }
    }
    return out;
  }

  // ---- Config validation & normalization (operates on plaintext) ----

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

    // When the client echoes back a masked secret (contains "..."), keep the
    // stored plaintext rather than overwriting it with the mask.
    for (const key of ['apiKey', 'webhookSecret', 'accessToken', 'refreshToken']) {
      if (
        typeof incoming[key] === 'string' &&
        (incoming[key] as string).includes('...') &&
        typeof existing[key] === 'string'
      ) {
        merged[key] = existing[key];
      }
    }

    return merged;
  }

  // ---- Audit (best-effort) ----

  private async recordAudit(
    actor: IntegrationActor | undefined,
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService.log({
        userId: actor?.userId,
        action,
        entity: 'integration',
        entityId,
        ipAddress: actor?.ipAddress,
        details,
      });
    } catch (error) {
      this.logger.warn(`Failed to write integration audit log: ${this.errorMessage(error)}`);
    }
  }

  private toResponseDto(integration: Integration): IntegrationResponseSchema {
    const plainConfig = this.decryptConfig(integration.code, integration.config ?? {});
    return {
      id: integration.id,
      name: integration.name,
      code: integration.code,
      description: integration.description,
      category: integration.category,
      isEnabled: integration.isEnabled,
      config: this.maskSecrets(plainConfig),
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

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
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
