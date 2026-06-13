import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Repository, SelectQueryBuilder } from "typeorm";
import { AppealPeriodFilter } from "../src/modules/appeals/dto/appeal-query.dto";
import type { Appeal } from "../src/modules/appeals/entities/appeal.entity";
import {
  AppealSource,
  AppealStatus,
  AppealType,
  TargetRole,
} from "../src/modules/appeals/entities/appeal.entity";
import { AppealsService } from "../src/modules/appeals/appeals.service";

describe("AppealsService", () => {
  const appealId = "4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1";
  const appeal = {
    id: appealId,
    fullName: "Ali Valiyev",
    phone: "+998901234567",
    type: AppealType.SUGGESTION,
    targetRole: TargetRole.CLASS_TEACHER,
    description: "Sinf xonasi uchun yangi partalar kerak.",
    source: AppealSource.PUBLIC_LINK,
    status: AppealStatus.PENDING,
    createdAt: new Date("2026-06-09T07:00:00.000Z"),
    updatedAt: new Date("2026-06-09T07:00:00.000Z"),
    deletedAt: null,
    version: 1,
  } as Appeal;
  let appeals: jest.Mocked<
    Pick<
      Repository<Appeal>,
      | "create"
      | "save"
      | "findOne"
      | "count"
      | "softDelete"
      | "createQueryBuilder"
    >
  >;
  let service: AppealsService;

  beforeEach(() => {
    appeals = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    service = new AppealsService(appeals as unknown as Repository<Appeal>);
  });

  it("creates appeal from public form with pending status", async () => {
    appeals.create.mockImplementation((value) => value as Appeal);
    appeals.save.mockResolvedValue(appeal);

    const result = await service.create({
      fullName: "Ali Valiyev",
      phone: "+998 90 123 45 67",
      type: AppealType.SUGGESTION,
      targetRole: TargetRole.CLASS_TEACHER,
      description: "Sinf xonasi uchun yangi partalar kerak.",
    });

    expect(appeals.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Ali Valiyev",
        phone: "+998901234567",
        status: AppealStatus.PENDING,
        source: AppealSource.PUBLIC_LINK,
      }),
    );
    expect(result).toMatchObject({
      id: appealId,
      fullName: "Ali Valiyev",
      status: AppealStatus.PENDING,
    });
  });

  it("returns filtered appeals with dashboard stats", async () => {
    const qb = createAppealQueryBuilderMock([appeal], 1);
    appeals.createQueryBuilder.mockReturnValue(
      qb as unknown as SelectQueryBuilder<Appeal>,
    );
    appeals.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2);

    const result = await service.findAll({
      page: 1,
      limit: 20,
      search: "ali",
      type: AppealType.SUGGESTION,
      targetRole: TargetRole.CLASS_TEACHER,
      source: AppealSource.PUBLIC_LINK,
      period: AppealPeriodFilter.MONTH,
    });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, pageCount: 1 });
    expect(result.stats).toEqual({
      totalCount: 10,
      suggestionCount: 6,
      complaintCount: 4,
      monthCount: 2,
    });
  });

  it("updates appeal status and rejects empty update payload", async () => {
    appeals.findOne.mockResolvedValue(appeal);
    appeals.save.mockImplementation(async (value) => value as Appeal);

    const result = await service.update(appealId, {
      status: AppealStatus.RESOLVED,
    });

    expect(appeals.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: AppealStatus.RESOLVED }),
    );
    expect(result.status).toBe(AppealStatus.RESOLVED);
    await expect(service.update(appealId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("throws NotFoundException when appeal is missing", async () => {
    appeals.findOne.mockResolvedValue(null);

    await expect(service.findOne(appealId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("archives appeal with soft delete", async () => {
    appeals.findOne.mockResolvedValue(appeal);
    appeals.softDelete.mockResolvedValue({
      affected: 1,
      raw: {},
      generatedMaps: [],
    });

    await service.remove(appealId);

    expect(appeals.softDelete).toHaveBeenCalledWith(appealId);
  });
});

const createAppealQueryBuilderMock = (items: Appeal[], total: number) => {
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
