import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { AppealPeriodFilter } from '../src/modules/appeals/dto/appeal-query.dto';
import type { AuditService } from '../src/modules/audit/audit.service';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { NotificationsService } from '../src/modules/notifications/notifications.service';
import { NotificationChannel } from '../src/modules/notifications/enums/notification-status.enum';
import { AppealsService } from '../src/modules/appeals/appeals.service';
import {
  Appeal,
  AppealSource,
  AppealStatus,
  AppealType,
  TargetRole,
} from '../src/modules/appeals/entities/appeal.entity';
import type { AppealPublicLink } from '../src/modules/appeals/entities/appeal-public-link.entity';

describe('AppealsService', () => {
  const appealId = '4a2e4bf2-0d57-45aa-a3b2-a8c8a7a6f4d1';
  const actor = { userId: 'admin-1', ipAddress: '127.0.0.1' };
  const appeal = {
    id: appealId,
    fullName: 'Ali Valiyev',
    phone: '+998901234567',
    type: AppealType.SUGGESTION,
    targetRole: TargetRole.CLASS_TEACHER,
    description: 'Sinf xonasi uchun yangi partalar kerak.',
    source: AppealSource.MANUAL,
    status: AppealStatus.PENDING,
    createdAt: new Date('2026-06-09T07:00:00.000Z'),
    updatedAt: new Date('2026-06-09T07:00:00.000Z'),
    deletedAt: null,
    version: 1,
  } as Appeal;

  let appeals: jest.Mocked<
    Pick<Repository<Appeal>, 'create' | 'save' | 'findOne' | 'count' | 'softDelete' | 'createQueryBuilder'>
  >;
  let publicLinks: jest.Mocked<Pick<Repository<AppealPublicLink>, 'findOne'>>;
  let users: { findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let notifications: { queueNotification: jest.Mock };
  let audit: { log: jest.Mock };
  let service: AppealsService;

  const mockRecipients = (ids: string[]): void => {
    users.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(ids.map((id) => ({ id }))),
    });
  };

  beforeEach(() => {
    appeals = {
      create: jest.fn().mockImplementation((value) => value as Appeal),
      save: jest.fn().mockImplementation(async (value) => ({ id: appealId, version: 1, ...value }) as Appeal),
      findOne: jest.fn(),
      count: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
      createQueryBuilder: jest.fn(),
    };
    publicLinks = { findOne: jest.fn() };
    users = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
    notifications = { queueNotification: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    mockRecipients([]);

    service = new AppealsService(
      appeals as unknown as Repository<Appeal>,
      publicLinks as unknown as Repository<AppealPublicLink>,
      users as unknown as Repository<User>,
      notifications as unknown as NotificationsService,
      audit as unknown as AuditService,
      { get: jest.fn() } as unknown as ConfigService,
    );
  });

  const baseCreateDto = {
    fullName: 'Ali Valiyev',
    phone: '+998 90 123 45 67',
    type: AppealType.SUGGESTION,
    targetRole: TargetRole.CLASS_TEACHER,
    description: 'Sinf xonasi uchun yangi partalar kerak.',
  };

  it('manual create normalizes phone, defaults MANUAL source, audits, and notifies role holders', async () => {
    mockRecipients(['teacher-1', 'teacher-2']);

    const result = await service.create(baseCreateDto, actor);

    expect(appeals.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Ali Valiyev',
        phone: '+998901234567',
        status: AppealStatus.PENDING,
        source: AppealSource.MANUAL,
      }),
    );
    expect(result.source).toBe(AppealSource.MANUAL);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'appeal.created', entity: 'appeal', entityId: appealId }),
    );
    expect(notifications.queueNotification).toHaveBeenCalledTimes(2);
    expect(notifications.queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'teacher-1', channel: NotificationChannel.PUSH }),
    );
  });

  it('still creates the appeal even if notification dispatch fails', async () => {
    mockRecipients(['teacher-1']);
    notifications.queueNotification.mockRejectedValueOnce(new Error('broker down'));

    await expect(service.create(baseCreateDto, actor)).resolves.toMatchObject({ id: appealId });
  });

  it('returns filtered appeals with dashboard stats', async () => {
    const qb = createAppealQueryBuilderMock([appeal], 1);
    appeals.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<Appeal>);
    appeals.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2);

    const result = await service.findAll({
      page: 1,
      limit: 20,
      search: 'ali',
      type: AppealType.SUGGESTION,
      targetRole: TargetRole.CLASS_TEACHER,
      source: AppealSource.MANUAL,
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

  it('throws NotFoundException when appeal is missing', async () => {
    appeals.findOne.mockResolvedValue(null);

    await expect(service.findOne(appealId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects empty update payloads', async () => {
    await expect(service.update(appealId, {}, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects assignment to an unknown user', async () => {
    appeals.findOne.mockResolvedValue({ id: appealId } as Appeal);
    users.findOne.mockResolvedValue(null);

    await expect(
      service.assign(appealId, { assigneeUserId: 'ghost' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects assignment to an inactive user', async () => {
    appeals.findOne.mockResolvedValue({ id: appealId } as Appeal);
    users.findOne.mockResolvedValue({ id: 'u1', status: CommonStatus.INACTIVE } as User);

    await expect(
      service.assign(appealId, { assigneeUserId: 'u1' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assigns to an active user and notifies them', async () => {
    appeals.findOne.mockResolvedValue({ id: appealId, type: AppealType.COMPLAINT } as Appeal);
    users.findOne.mockResolvedValue({ id: 'u1', status: CommonStatus.ACTIVE } as User);

    const result = await service.assign(appealId, { assigneeUserId: 'u1' }, actor);

    expect(result.assigneeUserId).toBe('u1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'appeal.assigned' }));
    expect(notifications.queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'u1', payload: expect.objectContaining({ kind: 'assigned' }) }),
    );
  });

  it('blocks an illegal status transition', async () => {
    appeals.findOne.mockResolvedValue({ id: appealId, status: AppealStatus.RESOLVED } as Appeal);

    await expect(
      service.update(appealId, { status: AppealStatus.PENDING }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a resolution note when moving to a terminal status', async () => {
    appeals.findOne.mockResolvedValue({ id: appealId, status: AppealStatus.IN_PROGRESS } as Appeal);

    await expect(
      service.update(appealId, { status: AppealStatus.RESOLVED }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves with a note and stamps resolver + timestamp', async () => {
    appeals.findOne.mockResolvedValue({ id: appealId, status: AppealStatus.IN_PROGRESS } as Appeal);

    const result = await service.update(
      appealId,
      { status: AppealStatus.RESOLVED, resolutionNote: 'Masala hal qilindi' },
      actor,
    );

    expect(result.status).toBe(AppealStatus.RESOLVED);
    expect(result.resolutionNote).toBe('Masala hal qilindi');
    expect(result.resolvedById).toBe(actor.userId);
    expect(result.resolvedAt).toBeInstanceOf(Date);
  });

  it('clears resolution data when an appeal is reopened', async () => {
    appeals.findOne.mockResolvedValue({
      id: appealId,
      status: AppealStatus.RESOLVED,
      resolutionNote: 'eski izoh',
      resolvedById: 'someone',
      resolvedAt: new Date(),
    } as Appeal);

    const result = await service.update(appealId, { status: AppealStatus.IN_PROGRESS }, actor);

    expect(result.status).toBe(AppealStatus.IN_PROGRESS);
    expect(result.resolvedById).toBeNull();
    expect(result.resolvedAt).toBeNull();
  });

  it('archives appeal with soft delete and audits it', async () => {
    appeals.findOne.mockResolvedValue(appeal);

    await service.remove(appealId, actor);

    expect(appeals.softDelete).toHaveBeenCalledWith(appealId);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'appeal.archived' }));
  });

  it('notifies role holders on a public submission', async () => {
    publicLinks.findOne.mockResolvedValue({ token: 'tok', isActive: true } as AppealPublicLink);
    mockRecipients(['director-1']);

    const result = await service.createPublicAppeal('tok', {
      fullName: 'Ali Valiyev',
      phone: '+998901234567',
      type: AppealType.SUGGESTION,
      targetRole: TargetRole.DIRECTOR,
      description: 'Sinf xonasi uchun yangi partalar kerak.',
    });

    expect(result).toEqual({ id: appealId });
    expect(notifications.queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'director-1' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'appeal.public_created' }),
    );
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
