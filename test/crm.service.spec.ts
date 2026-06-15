import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { CrmService } from '../src/modules/crm/crm.service';
import type { Lead } from '../src/modules/crm/entities/lead.entity';
import type { LeadSource } from '../src/modules/crm/entities/lead-source.entity';
import { LeadStatus } from '../src/modules/crm/enums/lead-status.enum';
import type { AuditService } from '../src/modules/audit/audit.service';

const leadEntity = (over: Partial<Lead> = {}): Lead =>
  ({
    id: 'lead-1',
    firstName: 'Nodir',
    lastName: 'Toshmatov',
    phone: '+998901234567',
    status: LeadStatus.NEW,
    ...over,
  }) as Lead;

describe('CrmService', () => {
  let leads: Record<string, jest.Mock>;
  let sources: Record<string, jest.Mock>;
  let audit: { log: jest.Mock };
  let service: CrmService;

  beforeEach(() => {
    leads = {
      create: jest.fn((v: Partial<Lead>) => v as Lead),
      save: jest.fn(async (v: Partial<Lead>) => ({ id: 'lead-1', ...v }) as Lead),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    sources = {
      create: jest.fn((v: Partial<LeadSource>) => v as LeadSource),
      save: jest.fn(async (v: Partial<LeadSource>) => ({ id: 'src-1', ...v }) as LeadSource),
      findOne: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };
    audit = { log: jest.fn() };

    service = new CrmService(
      leads as unknown as Repository<Lead>,
      sources as unknown as Repository<LeadSource>,
      audit as unknown as AuditService,
    );
  });

  it('creates a lead and writes an audit log', async () => {
    leads.findOne.mockResolvedValue(leadEntity());

    const result = await service.createLead({ firstName: 'Nodir', phone: '+998901234567' });

    expect(leads.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'lead-1', fullName: 'Nodir Toshmatov', status: LeadStatus.NEW });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.created', entity: 'lead' }));
  });

  it('returns leads with kanban stats grouped by status', async () => {
    const statsQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: LeadStatus.NEW, count: '2' },
        { status: LeadStatus.CONTRACT, count: '1' },
      ]),
    };
    const mainQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnValue(statsQb),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[leadEntity()], 3]),
    };
    leads.createQueryBuilder.mockReturnValue(mainQb as never);

    const result = await service.findLeads({ page: 1, limit: 20 });

    expect(result.stats).toMatchObject({ total: 3, new: 2, contract: 1, contacted: 0 });
    expect(result.items).toHaveLength(1);
    expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 3 });
  });

  it('changes a lead status and audits status_changed', async () => {
    leads.findOne.mockResolvedValue(leadEntity({ status: LeadStatus.NEW }));

    await service.moveLead('lead-1', LeadStatus.CONTACTED);

    expect(leads.save).toHaveBeenCalledWith(expect.objectContaining({ status: LeadStatus.CONTACTED }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.status_changed' }));
  });

  it('soft-deletes a lead with an audit log', async () => {
    leads.findOne.mockResolvedValue(leadEntity());
    leads.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.deleteLead('lead-1');

    expect(leads.softDelete).toHaveBeenCalledWith('lead-1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.deleted' }));
  });

  it('throws NotFoundException for a missing lead', async () => {
    leads.findOne.mockResolvedValue(null);
    await expect(service.findLead('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a source with a derived code', async () => {
    sources.findOne.mockResolvedValue(null);

    const result = await service.createSource({ name: 'Instagram' });

    expect(sources.save).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INSTAGRAM', name: { uz: 'Instagram', ru: 'Instagram', en: 'Instagram' } }),
    );
    expect(result).toMatchObject({ code: 'INSTAGRAM', name: 'Instagram' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead_source.created', entity: 'lead_source' }));
  });

  it('rejects a duplicate source name', async () => {
    sources.findOne.mockResolvedValue({ id: 'src-x' } as LeadSource);
    await expect(service.createSource({ name: 'Instagram' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to delete a source still used by leads', async () => {
    sources.findOne.mockResolvedValue({ id: 'src-1', code: 'INSTAGRAM' } as LeadSource);
    leads.count.mockResolvedValue(3);

    await expect(service.deleteSource('src-1')).rejects.toBeInstanceOf(ConflictException);
    expect(sources.delete).not.toHaveBeenCalled();
  });
});
