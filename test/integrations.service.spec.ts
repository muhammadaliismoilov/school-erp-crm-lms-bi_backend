import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import type { Repository, SelectQueryBuilder } from "typeorm";
import type { Integration } from "../src/modules/integrations/entities/integration.entity";
import {
  IntegrationCategory,
  IntegrationCode,
  OpenAiModel,
} from "../src/modules/integrations/entities/integration.entity";
import { IntegrationsService } from "../src/modules/integrations/integrations.service";

describe("IntegrationsService", () => {
  const integrationId = "06093488-9fc7-44d7-b552-bd744194621a";
  const integration = {
    id: integrationId,
    name: "OpenAI",
    code: IntegrationCode.OPENAI,
    description: "AI yordamchi va matn generatsiya",
    category: IntegrationCategory.AI_ASSISTANTS,
    isEnabled: true,
    config: {
      apiKey: "sk-proj-real-secret",
      model: OpenAiModel.GPT_4O_MINI,
      enabled: true,
    },
    createdAt: new Date("2026-06-09T07:00:00.000Z"),
    updatedAt: new Date("2026-06-09T07:00:00.000Z"),
    deletedAt: null,
    version: 1,
  } as Integration;
  let integrations: jest.Mocked<
    Pick<
      Repository<Integration>,
      | "create"
      | "save"
      | "findOne"
      | "count"
      | "softDelete"
      | "createQueryBuilder"
    >
  >;
  let service: IntegrationsService;

  beforeEach(() => {
    integrations = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    service = new IntegrationsService(
      integrations as unknown as Repository<Integration>,
    );
  });

  it("creates OpenAI integration and masks secrets in response", async () => {
    integrations.findOne.mockResolvedValue(null);
    integrations.create.mockImplementation((value) => value as Integration);
    integrations.save.mockResolvedValue(integration);

    const result = await service.create({
      name: "OpenAI",
      code: IntegrationCode.OPENAI,
      description: "AI yordamchi va matn generatsiya",
      category: IntegrationCategory.AI_ASSISTANTS,
      isEnabled: true,
      config: {
        apiKey: "sk-proj-real-secret",
        model: OpenAiModel.GPT_4O_MINI,
        enabled: true,
      },
    });

    expect(integrations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: IntegrationCode.OPENAI,
        isEnabled: true,
      }),
    );
    expect(result.config).toMatchObject({
      apiKey: "sk-proj...cret",
      model: OpenAiModel.GPT_4O_MINI,
    });
    expect(JSON.stringify(result)).not.toContain("sk-proj-real-secret");
  });

  it("rejects duplicate integration code", async () => {
    integrations.findOne.mockResolvedValue(integration);

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
    const qb = createIntegrationQueryBuilderMock([integration], 1);
    integrations.createQueryBuilder.mockReturnValue(
      qb as unknown as SelectQueryBuilder<Integration>,
    );
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
  });

  it("validates OnlinePBX config before saving", async () => {
    integrations.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        name: "OnlinePBX",
        code: IntegrationCode.ONLINE_PBX,
        category: IntegrationCategory.TELEPHONY,
        config: {
          domain: "",
          apiKey: "",
          webhookSecret: "",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates integration settings and rejects empty update payload", async () => {
    integrations.findOne.mockResolvedValue(integration);
    integrations.save.mockImplementation(async (value) => value as Integration);

    const result = await service.update(integrationId, {
      isEnabled: false,
    });

    expect(integrations.save).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false }),
    );
    expect(result.isEnabled).toBe(false);
    await expect(service.update(integrationId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("throws NotFoundException when integration is missing", async () => {
    integrations.findOne.mockResolvedValue(null);

    await expect(service.findOne(integrationId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

const createIntegrationQueryBuilderMock = (
  items: Integration[],
  total: number,
) => {
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
