import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Repository, SelectQueryBuilder } from "typeorm";
import type { AuditService } from "../src/modules/audit/audit.service";
import type { EncryptionService } from "../src/common/security/encryption.service";
import type { Integration } from "../src/modules/integrations/entities/integration.entity";
import {
  IntegrationCategory,
  IntegrationCode,
  OpenAiModel,
} from "../src/modules/integrations/entities/integration.entity";
import { IntegrationsService } from "../src/modules/integrations/integrations.service";
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

/** Reversible stand-in for AES-GCM that keeps the real `v1.<iv>.<tag>.<ct>` shape. */
const fakeEncryption = {
  encrypt: (plaintext: string): string =>
    `v1.iv.tag.${Buffer.from(plaintext, "utf8").toString("base64")}`,
  decrypt: (payload: string): string =>
    Buffer.from(payload.split(".")[3], "base64").toString("utf8"),
};

describe("IntegrationsService", () => {
  const integrationId = "06093488-9fc7-44d7-b552-bd744194621a";
  const actor = { userId: "admin-1", ipAddress: "127.0.0.1" };

  /** Stored row: apiKey is encrypted at rest, as the DB would hold it. */
  const storedIntegration = (): Integration =>
    ({
      id: integrationId,
      name: "OpenAI",
      code: IntegrationCode.OPENAI,
      description: "AI yordamchi va matn generatsiya",
      category: IntegrationCategory.AI_ASSISTANTS,
      isEnabled: true,
      config: {
        apiKey: fakeEncryption.encrypt("sk-proj-real-secret"),
        model: OpenAiModel.GPT_4O_MINI,
        enabled: true,
      },
      createdAt: new Date("2026-06-09T07:00:00.000Z"),
      updatedAt: new Date("2026-06-09T07:00:00.000Z"),
      deletedAt: null,
      version: 1,
    }) as Integration;

  let integrations: jest.Mocked<
    Pick<Repository<Integration>, "create" | "save" | "findOne" | "count" | "softDelete" | "createQueryBuilder">
  >;
  let audit: { log: jest.Mock };
  let service: IntegrationsService;

  beforeEach(() => {
    integrations = {
      create: jest.fn().mockImplementation((value) => value as Integration),
      save: jest.fn().mockImplementation(async (value) => ({ id: integrationId, version: 1, ...value }) as Integration),
      findOne: jest.fn(),
      count: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
      createQueryBuilder: jest.fn(),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new IntegrationsService(
      integrations as unknown as Repository<Integration>,
      fakeEncryption as unknown as EncryptionService,
      audit as unknown as AuditService,
      { get: jest.fn() } as unknown as ConfigService,
      new TenantContextService(),
    );
  });

  it("encrypts secrets at rest and masks them in the response", async () => {
    integrations.findOne.mockResolvedValue(null);

    const result = await service.create(
      {
        name: "OpenAI",
        code: IntegrationCode.OPENAI,
        category: IntegrationCategory.AI_ASSISTANTS,
        isEnabled: true,
        config: { apiKey: "sk-proj-real-secret", model: OpenAiModel.GPT_4O_MINI, enabled: true },
      },
      actor,
    );

    // Persisted entity must hold the ENCRYPTED key, never plaintext.
    const persisted = integrations.save.mock.calls[0][0] as Integration;
    expect(typeof persisted.config.apiKey).toBe("string");
    expect(persisted.config.apiKey as string).toMatch(/^v1\./);
    expect(persisted.config.apiKey).not.toBe("sk-proj-real-secret");

    // Response masks the (decrypted) secret and never leaks plaintext.
    expect(result.config).toMatchObject({ apiKey: "sk-proj...cret", model: OpenAiModel.GPT_4O_MINI });
    expect(JSON.stringify(result)).not.toContain("sk-proj-real-secret");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "integration.created" }));
  });

  it("rejects duplicate integration code", async () => {
    integrations.findOne.mockResolvedValue(storedIntegration());

    await expect(
      service.create({
        name: "OpenAI",
        code: IntegrationCode.OPENAI,
        category: IntegrationCategory.AI_ASSISTANTS,
        config: { apiKey: "sk-proj-secret", model: OpenAiModel.GPT_4O_MINI },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("returns filtered integrations with connected stats", async () => {
    const qb = createIntegrationQueryBuilderMock([storedIntegration()], 1);
    integrations.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<Integration>);
    integrations.count.mockResolvedValueOnce(2).mockResolvedValueOnce(2);

    const result = await service.findAll({
      page: 1,
      limit: 20,
      search: "open",
      category: IntegrationCategory.AI_ASSISTANTS,
      isEnabled: true,
    });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, pageCount: 1 });
    expect(result.stats).toEqual({ totalCount: 2, connectedCount: 2 });
    // List response is masked too.
    expect(result.items[0].config.apiKey).toBe("sk-proj...cret");
  });

  it("validates OnlinePBX config before saving", async () => {
    integrations.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        name: "OnlinePBX",
        code: IntegrationCode.ONLINE_PBX,
        category: IntegrationCategory.TELEPHONY,
        config: { domain: "", apiKey: "", webhookSecret: "" },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("keeps the stored secret when the client resubmits a masked value", async () => {
    integrations.findOne.mockResolvedValue(storedIntegration());

    const result = await service.update(
      integrationId,
      { config: { apiKey: "sk-proj...cret", model: OpenAiModel.GPT_4O_MINI, enabled: true } },
      actor,
    );

    const persisted = integrations.save.mock.calls[0][0] as Integration;
    // Re-encrypted original, not the mask.
    expect(fakeEncryption.decrypt(persisted.config.apiKey as string)).toBe("sk-proj-real-secret");
    expect(result.config.apiKey).toBe("sk-proj...cret");
  });

  it("toggles isEnabled without touching the encrypted config, and rejects empty payloads", async () => {
    integrations.findOne.mockResolvedValue(storedIntegration());

    const result = await service.update(integrationId, { isEnabled: false }, actor);

    const persisted = integrations.save.mock.calls[0][0] as Integration;
    expect(persisted.config.apiKey as string).toMatch(/^v1\./); // untouched, still encrypted
    expect(result.isEnabled).toBe(false);
    expect(result.config.apiKey).toBe("sk-proj...cret");

    await expect(service.update(integrationId, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws NotFoundException when integration is missing", async () => {
    integrations.findOne.mockResolvedValue(null);

    await expect(service.findOne(integrationId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("archives an integration and audits it", async () => {
    integrations.findOne.mockResolvedValue(storedIntegration());

    await service.remove(integrationId, actor);

    expect(integrations.softDelete).toHaveBeenCalledWith(integrationId);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "integration.archived" }));
  });

  describe("testConnection", () => {
    const fetchMock = jest.fn();
    beforeEach(() => {
      (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
      fetchMock.mockReset();
      integrations.findOne.mockResolvedValue(storedIntegration());
    });

    it("reports ok when OpenAI accepts the key", async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      const result = await service.testConnection(integrationId, actor);

      expect(result.ok).toBe(true);
      // The live call must use the DECRYPTED key.
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.openai.com/v1/models",
        expect.objectContaining({
          headers: { Authorization: "Bearer sk-proj-real-secret" },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "integration.tested", details: expect.objectContaining({ ok: true }) }),
      );
    });

    it("reports failure on a 401 from OpenAI", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401 });

      const result = await service.testConnection(integrationId, actor);

      expect(result.ok).toBe(false);
      expect(result.message).toContain("401");
    });

    it("never throws when the provider is unreachable", async () => {
      fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await service.testConnection(integrationId, actor);

      expect(result.ok).toBe(false);
    });
  });

  it("seeds missing catalog rows on bootstrap", async () => {
    integrations.findOne.mockResolvedValue(null); // nothing exists yet

    await service.onApplicationBootstrap();

    // One save per catalog entry (OpenAI + OnlinePBX).
    expect(integrations.save).toHaveBeenCalledTimes(2);
    const codes = integrations.save.mock.calls.map((c) => (c[0] as Integration).code);
    expect(codes).toEqual(expect.arrayContaining([IntegrationCode.OPENAI, IntegrationCode.ONLINE_PBX]));
  });

  it("does not reseed catalog rows that already exist", async () => {
    integrations.findOne.mockResolvedValue(storedIntegration());

    await service.onApplicationBootstrap();

    expect(integrations.save).not.toHaveBeenCalled();
  });
});

const createIntegrationQueryBuilderMock = (items: Integration[], total: number) => {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([items, total]),
  };

  return qb;
};
