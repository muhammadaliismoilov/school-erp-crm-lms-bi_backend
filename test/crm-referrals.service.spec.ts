import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Repository } from "typeorm";
import { ReferralsService } from "../src/modules/crm/referrals.service";
import type { Referral } from "../src/modules/crm/entities/referral.entity";
import type { Lead } from "../src/modules/crm/entities/lead.entity";
import type { LeadSource } from "../src/modules/crm/entities/lead-source.entity";
import type { AuditService } from "../src/modules/audit/audit.service";
import { ReferralTemplate } from "../src/modules/crm/enums/referral-template.enum";
import { LeadStatus } from "../src/modules/crm/enums/lead-status.enum";

const referralEntity = (over: Partial<Referral> = {}): Referral =>
  ({
    id: "ref-1",
    name: "Instagram aksiya",
    code: "5262804",
    template: ReferralTemplate.CLASSIC,
    isActive: true,
    expiresAt: null,
    sourceId: "src-1",
    source: { id: "src-1", code: "INSTAGRAM", name: { uz: "Instagram" } },
    createdAt: new Date("2026-06-16T00:00:00.000Z"),
    ...over,
  }) as Referral;

describe("ReferralsService", () => {
  let referrals: Record<string, jest.Mock>;
  let leads: Record<string, jest.Mock>;
  let sources: Record<string, jest.Mock>;
  let config: { get: jest.Mock };
  let audit: { log: jest.Mock };
  let service: ReferralsService;

  beforeEach(() => {
    referrals = {
      create: jest.fn((v: Partial<Referral>) => v as Referral),
      save: jest.fn(async (v: Partial<Referral>) => ({ id: "ref-1", ...v }) as Referral),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    leads = {
      create: jest.fn((v: Partial<Lead>) => v as Lead),
      save: jest.fn(async (v: Partial<Lead>) => ({ id: "lead-1", ...v }) as Lead),
      createQueryBuilder: jest.fn(),
    };
    sources = { findOne: jest.fn() };
    config = { get: jest.fn().mockReturnValue("https://app.example.com") };
    audit = { log: jest.fn() };

    service = new ReferralsService(
      referrals as unknown as Repository<Referral>,
      leads as unknown as Repository<Lead>,
      sources as unknown as Repository<LeadSource>,
      config as unknown as ConfigService,
      audit as unknown as AuditService,
    );
  });

  it("creates a referral with a unique code, url and audit", async () => {
    sources.findOne.mockResolvedValueOnce({ id: "src-1" }); // ensureSourceExists
    referrals.findOne.mockResolvedValueOnce(null); // generateUniqueCode → free
    referrals.findOne.mockResolvedValueOnce(referralEntity()); // findEntity after save
    leads.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    } as never);

    const result = await service.createReferral({ name: "Instagram aksiya", sourceId: "src-1" }, { userId: "u1" });

    expect(referrals.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Instagram aksiya", code: expect.any(String), isActive: true }),
    );
    expect(result.url).toBe("https://app.example.com/referral/5262804");
    expect(result.status).toBe("active");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "referral.created", entity: "referral" }));
  });

  it("rejects creating a referral with a missing source", async () => {
    sources.findOne.mockResolvedValue(null);
    await expect(service.createReferral({ name: "x", sourceId: "ghost" })).rejects.toBeInstanceOf(BadRequestException);
    expect(referrals.save).not.toHaveBeenCalled();
  });

  it("validates an active public referral", async () => {
    referrals.findOne.mockResolvedValue(referralEntity());
    const info = await service.validatePublicReferral("5262804");
    expect(info).toMatchObject({ valid: true, name: "Instagram aksiya", sourceName: "Instagram" });
  });

  it("rejects an expired public referral with NotFound", async () => {
    referrals.findOne.mockResolvedValue(referralEntity({ expiresAt: new Date("2000-01-01T00:00:00.000Z") }));
    await expect(service.validatePublicReferral("5262804")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a disabled public referral with NotFound", async () => {
    referrals.findOne.mockResolvedValue(referralEntity({ isActive: false }));
    await expect(service.validatePublicReferral("5262804")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates a lead from a public submission with source + referralCode", async () => {
    referrals.findOne.mockResolvedValue(referralEntity());
    const res = await service.submitPublicLead("5262804", { firstName: "Ali", phone: "+998901234567" });
    expect(leads.save).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Ali", phone: "+998901234567", sourceId: "src-1", referralCode: "5262804", status: LeadStatus.NEW }),
    );
    expect(res.id).toBe("lead-1");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "lead.referral_created" }));
  });

  it("silently discards a honeypot-tripped submission", async () => {
    referrals.findOne.mockResolvedValue(referralEntity());
    const res = await service.submitPublicLead("5262804", { firstName: "Bot", phone: "+998901234567", website: "spam" });
    expect(leads.save).not.toHaveBeenCalled();
    expect(res.id).toEqual(expect.any(String));
  });

  it("soft-deletes a referral with an audit log", async () => {
    referrals.findOne.mockResolvedValue(referralEntity());
    await service.deleteReferral("ref-1", { userId: "u1" });
    expect(referrals.softDelete).toHaveBeenCalledWith("ref-1");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "referral.deleted" }));
  });
});
