import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { CrmService } from '../src/modules/crm/crm.service';
import type { Lead } from '../src/modules/crm/entities/lead.entity';
import type { LeadComment } from '../src/modules/crm/entities/lead-comment.entity';
import type { LeadSource } from '../src/modules/crm/entities/lead-source.entity';
import type { LeadTag } from '../src/modules/crm/entities/lead-tag.entity';
import { LeadStatus } from '../src/modules/crm/enums/lead-status.enum';
import type { AuditService } from '../src/modules/audit/audit.service';
import type { StudentsService } from '../src/modules/students/students.service';

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
  let comments: Record<string, jest.Mock>;
  let tags: Record<string, jest.Mock>;
  let studentsService: { enrollStudent: jest.Mock };
  let audit: { log: jest.Mock; findForEntity: jest.Mock };
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
    comments = {
      create: jest.fn((v: Partial<LeadComment>) => v as LeadComment),
      save: jest.fn(async (v: Partial<LeadComment>) => ({ id: 'cmt-1', ...v }) as LeadComment),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      softDelete: jest.fn(),
    };
    tags = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({ id: 'tag-1', ...v })),
      findOne: jest.fn(),
      findBy: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    studentsService = { enrollStudent: jest.fn() };
    audit = { log: jest.fn(), findForEntity: jest.fn() };

    service = new CrmService(
      leads as unknown as Repository<Lead>,
      sources as unknown as Repository<LeadSource>,
      comments as unknown as Repository<LeadComment>,
      tags as unknown as Repository<LeadTag>,
      studentsService as unknown as StudentsService,
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
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: LeadStatus.NEW, count: '2' },
        { status: LeadStatus.CONTRACT, count: '1' },
      ]),
      getManyAndCount: jest.fn().mockResolvedValue([[leadEntity()], 3]),
    };
    // Stats query and list query each call createQueryBuilder once.
    leads.createQueryBuilder.mockReturnValue(qb as never);

    const result = await service.findLeads({ page: 1, limit: 20 });

    expect(result.stats).toMatchObject({ total: 3, new: 2, contract: 1, contacted: 0 });
    expect(result.items).toHaveLength(1);
    expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 3 });
  });

  it('changes a lead status and audits status_changed', async () => {
    leads.findOne.mockResolvedValue(leadEntity({ status: LeadStatus.NEW }));

    await service.moveLead('lead-1', { status: LeadStatus.CONTACTED });

    expect(leads.save).toHaveBeenCalledWith(expect.objectContaining({ status: LeadStatus.CONTACTED }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.status_changed' }));
  });

  it('attaches a comment to a status move with transition context', async () => {
    leads.findOne.mockResolvedValue(leadEntity({ status: LeadStatus.NEW }));
    comments.findOne.mockResolvedValue({
      id: 'cmt-1',
      body: 'Aloqaga chiqildi',
      authorId: 'user-1',
      isPinned: false,
      reminderDoneAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LeadComment);

    await service.moveLead(
      'lead-1',
      { status: LeadStatus.CONTACTED, comment: 'Aloqaga chiqildi', remindAt: '2026-06-16T03:00:00.000Z' },
      { userId: 'user-1' },
    );

    expect(comments.save).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'lead-1', authorId: 'user-1', body: 'Aloqaga chiqildi' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lead.comment_added',
        details: expect.objectContaining({ statusFrom: LeadStatus.NEW, statusTo: LeadStatus.CONTACTED }),
      }),
    );
  });

  it('adds a standalone comment authored by the actor', async () => {
    leads.findOne.mockResolvedValue(leadEntity());
    comments.findOne.mockResolvedValue({
      id: 'cmt-1',
      body: 'Ertaga soat 8 da eslatish',
      authorId: 'user-1',
      author: { id: 'user-1', firstName: 'Aziz', lastName: 'Toshmatov', username: 'aziz' },
      isPinned: false,
      reminderDoneAt: null,
      remindAt: new Date('2026-06-16T03:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LeadComment);

    const result = await service.addComment(
      'lead-1',
      { body: 'Ertaga soat 8 da eslatish', remindAt: '2026-06-16T03:00:00.000Z' },
      { userId: 'user-1' },
    );

    expect(result).toMatchObject({ author: { fullName: 'Aziz Toshmatov' }, reminderDone: false });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.comment_added' }));
  });

  it('forbids editing a comment authored by someone else', async () => {
    comments.findOne.mockResolvedValue({ id: 'cmt-1', leadId: 'lead-1', authorId: 'other-user' } as LeadComment);

    await expect(
      service.updateComment('lead-1', 'cmt-1', { body: 'hack' }, { userId: 'user-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(comments.save).not.toHaveBeenCalled();
  });

  it('marks a reminder done via reminderDone flag', async () => {
    comments.findOne.mockResolvedValue({
      id: 'cmt-1',
      leadId: 'lead-1',
      authorId: 'user-1',
      body: 'eslatma',
      isPinned: false,
      reminderDoneAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LeadComment);

    await service.updateComment('lead-1', 'cmt-1', { reminderDone: true }, { userId: 'user-1' });

    expect(comments.save).toHaveBeenCalledWith(
      expect.objectContaining({ reminderDoneAt: expect.any(Date) }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.comment_updated' }));
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

  it('builds the lead history timeline from the audit trail (newest first)', async () => {
    leads.findOne.mockResolvedValue(leadEntity());
    audit.findForEntity.mockResolvedValue([
      {
        id: 'a1',
        action: 'lead.created',
        createdAt: new Date('2026-06-15T09:00:00.000Z'),
        user: null,
        details: null,
      },
      {
        id: 'a2',
        action: 'lead.status_changed',
        createdAt: new Date('2026-06-15T10:00:00.000Z'),
        user: { firstName: 'Jamshid', lastName: 'Toshpulatov', username: 'jamshid' },
        details: { status: 'contacted' },
      },
    ]);

    const history = await service.findLeadHistory('lead-1');

    expect(audit.findForEntity).toHaveBeenCalledWith('lead', 'lead-1');
    expect(history).toHaveLength(2);
    // Newest first.
    expect(history[0]).toMatchObject({ action: 'lead.status_changed', actorName: 'Jamshid Toshpulatov' });
    // System entry has no actor.
    expect(history[1]).toMatchObject({ action: 'lead.created', actorName: null });
  });

  const enrollDto = {
    lastName: 'Valiyev',
    firstName: 'Ali',
    birthDate: '2015-03-20',
    birthCertificateSeries: 'AA',
    birthCertificateNumber: '1234567',
    guardianFullName: 'Eshturdiyev Umidjon',
    guardianPhone: '+998909066628',
  };

  it('enrolls a contract lead as a student and links it back', async () => {
    leads.findOne.mockResolvedValue(leadEntity({ status: LeadStatus.CONTRACT, enrolledStudentId: null }));
    studentsService.enrollStudent.mockResolvedValue({
      id: 'student-1',
      studentCode: 'ST-2026-0001',
      firstName: 'Ali',
      lastName: 'Valiyev',
    });

    const result = await service.enrollLead('lead-1', enrollDto, { userId: 'user-1' });

    expect(studentsService.enrollStudent).toHaveBeenCalledWith(enrollDto, 'lead-1');
    expect(leads.save).toHaveBeenCalledWith(expect.objectContaining({ enrolledStudentId: 'student-1' }));
    expect(result).toMatchObject({ studentId: 'student-1', studentCode: 'ST-2026-0001', leadId: 'lead-1' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.enrolled' }));
  });

  it('rejects enrolling a lead that is not in the contract stage', async () => {
    leads.findOne.mockResolvedValue(leadEntity({ status: LeadStatus.NEW }));

    await expect(service.enrollLead('lead-1', enrollDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(studentsService.enrollStudent).not.toHaveBeenCalled();
  });

  it('prevents enrolling the same lead twice', async () => {
    leads.findOne.mockResolvedValue(
      leadEntity({ status: LeadStatus.CONTRACT, enrolledStudentId: 'student-9' }),
    );

    await expect(service.enrollLead('lead-1', enrollDto)).rejects.toBeInstanceOf(ConflictException);
    expect(studentsService.enrollStudent).not.toHaveBeenCalled();
  });

  it('replaces lead tags after validating they exist', async () => {
    leads.findOne.mockResolvedValue(leadEntity({ status: LeadStatus.NEW }));
    tags.findBy.mockResolvedValue([{ id: 'tag-1' }, { id: 'tag-2' }]);

    await service.setLeadTags('lead-1', ['tag-1', 'tag-2'], { userId: 'user-1' });

    expect(leads.save).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [{ id: 'tag-1' }, { id: 'tag-2' }] }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.tags_changed' }));
  });

  it('throws NotFound when assigning a missing tag', async () => {
    leads.findOne.mockResolvedValue(leadEntity());
    tags.findBy.mockResolvedValue([{ id: 'tag-1' }]);

    await expect(service.setLeadTags('lead-1', ['tag-1', 'ghost'])).rejects.toBeInstanceOf(NotFoundException);
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
