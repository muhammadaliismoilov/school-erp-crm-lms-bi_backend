import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../src/modules/audit/audit.service';
import type { NotificationsService } from '../src/modules/notifications/notifications.service';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import type { ExamResult } from '../src/modules/lms/entities/exam-result.entity';
import type { JournalEntry } from '../src/modules/lms/entities/journal-entry.entity';
import type { QuarterSubjectGrade } from '../src/modules/lms/entities/quarter-subject-grade.entity';
import { GradeRequestsService } from '../src/modules/grade-requests/grade-requests.service';
import type { TenantContextService } from '../src/common/tenant/tenant-context.service';
import type {
  GradeChangeRequest} from '../src/modules/grade-requests/entities/grade-change-request.entity';
import {
  GradeRequestKind,
  GradeRequestStatus,
} from '../src/modules/grade-requests/entities/grade-change-request.entity';

describe('GradeRequestsService', () => {
  const actor = { userId: 'admin-1', ipAddress: '127.0.0.1' };
  const studentId = '11111111-1111-1111-1111-111111111111';
  const reqId = '22222222-2222-2222-2222-222222222222';
  const targetId = '33333333-3333-3333-3333-333333333333';

  const student = { id: studentId, firstName: 'Ali', lastName: 'Valiyev' } as Student;

  const baseRequest = (): GradeChangeRequest =>
    ({
      id: reqId,
      kind: GradeRequestKind.ASSESSMENT,
      studentId,
      subjectId: null,
      quarterId: null,
      targetEntityId: targetId,
      currentGrade: 3,
      requestedGrade: 5,
      reason: 'Qayta tekshirildi',
      status: GradeRequestStatus.PENDING,
      requestedById: 'teacher-1',
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
      applied: false,
      student,
      subject: null,
      createdAt: new Date('2026-06-19T07:00:00.000Z'),
      updatedAt: new Date('2026-06-19T07:00:00.000Z'),
      deletedAt: null,
      version: 1,
    }) as GradeChangeRequest;

  let requests: jest.Mocked<
    Pick<Repository<GradeChangeRequest>, 'create' | 'save' | 'findOne' | 'softDelete' | 'createQueryBuilder'>
  >;
  let students: { findOne: jest.Mock };
  let subjects: { findOne: jest.Mock };
  let quarters: { findOne: jest.Mock };
  let journal: { findOne: jest.Mock; save: jest.Mock };
  let quarterGrades: { findOne: jest.Mock; save: jest.Mock };
  let examResults: { findOne: jest.Mock; save: jest.Mock };
  let notifications: { queueNotification: jest.Mock };
  let audit: { log: jest.Mock };
  let service: GradeRequestsService;

  beforeEach(() => {
    requests = {
      create: jest.fn((x) => x as GradeChangeRequest),
      save: jest.fn(async (x) => x as GradeChangeRequest),
      findOne: jest.fn(),
      softDelete: jest.fn(async () => ({ affected: 1 }) as never),
      createQueryBuilder: jest.fn(),
    } as never;
    students = { findOne: jest.fn().mockResolvedValue(student) };
    subjects = { findOne: jest.fn() };
    quarters = { findOne: jest.fn() };
    journal = { findOne: jest.fn(), save: jest.fn(async (x) => x) };
    quarterGrades = { findOne: jest.fn(), save: jest.fn(async (x) => x) };
    examResults = { findOne: jest.fn(), save: jest.fn(async (x) => x) };
    notifications = { queueNotification: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new GradeRequestsService(
      requests as never as Repository<GradeChangeRequest>,
      students as never as Repository<Student>,
      subjects as never as Repository<Subject>,
      quarters as never as Repository<Quarter>,
      journal as never as Repository<JournalEntry>,
      quarterGrades as never as Repository<QuarterSubjectGrade>,
      examResults as never as Repository<ExamResult>,
      notifications as never as NotificationsService,
      audit as never as AuditService,
      undefined as unknown as TenantContextService,
    );
  });

  describe('create', () => {
    it('saves a pending request and snapshots the actor', async () => {
      requests.findOne.mockResolvedValue(baseRequest());
      const result = await service.create(
        {
          kind: GradeRequestKind.ASSESSMENT,
          studentId,
          requestedGrade: 5,
          currentGrade: 3,
          reason: 'Qayta tekshirildi',
        },
        actor,
      );
      expect(requests.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: GradeRequestStatus.PENDING, requestedById: 'admin-1' }),
      );
      expect(result.status).toBe(GradeRequestStatus.PENDING);
      expect(audit.log).toHaveBeenCalled();
    });

    it('throws NotFound when the student is missing', async () => {
      students.findOne.mockResolvedValue(null);
      await expect(
        service.create({ kind: GradeRequestKind.ASSESSMENT, studentId, requestedGrade: 5, reason: 'xxx' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires a quarter for quarter-kind requests', async () => {
      await expect(
        service.create({ kind: GradeRequestKind.QUARTER, studentId, requestedGrade: 5, reason: 'xxx' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('review', () => {
    it('approves and applies a 5-point grade to the journal entry', async () => {
      const entity = baseRequest();
      requests.findOne.mockResolvedValue(entity);
      journal.findOne.mockResolvedValue({ id: targetId, grade: 3, ball: null });

      await service.review(reqId, { status: GradeRequestStatus.APPROVED }, actor);

      expect(journal.save).toHaveBeenCalledWith(expect.objectContaining({ grade: 5 }));
      expect(requests.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: GradeRequestStatus.APPROVED, applied: true, reviewedById: 'admin-1' }),
      );
      expect(notifications.queueNotification).toHaveBeenCalled();
    });

    it('writes 100-point value to ball when above 5', async () => {
      const entity = baseRequest();
      entity.requestedGrade = 87;
      requests.findOne.mockResolvedValue(entity);
      journal.findOne.mockResolvedValue({ id: targetId, grade: null, ball: 50 });

      await service.review(reqId, { status: GradeRequestStatus.APPROVED }, actor);
      expect(journal.save).toHaveBeenCalledWith(expect.objectContaining({ ball: 87 }));
    });

    it('rejects only with a note', async () => {
      requests.findOne.mockResolvedValue(baseRequest());
      await expect(
        service.review(reqId, { status: GradeRequestStatus.REJECTED }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects with a note without touching grades', async () => {
      requests.findOne.mockResolvedValue(baseRequest());
      const result = await service.review(
        reqId,
        { status: GradeRequestStatus.REJECTED, reviewNote: 'Asossiz so‘rov' },
        actor,
      );
      expect(journal.save).not.toHaveBeenCalled();
      expect(result.status).toBe(GradeRequestStatus.REJECTED);
    });

    it('blocks reviewing an already-reviewed request', async () => {
      const entity = baseRequest();
      entity.status = GradeRequestStatus.APPROVED;
      requests.findOne.mockResolvedValue(entity);
      await expect(
        service.review(reqId, { status: GradeRequestStatus.REJECTED, reviewNote: 'xxx' }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approves without a target as not applied', async () => {
      const entity = baseRequest();
      entity.targetEntityId = null;
      requests.findOne.mockResolvedValue(entity);
      await service.review(reqId, { status: GradeRequestStatus.APPROVED }, actor);
      expect(requests.save).toHaveBeenCalledWith(expect.objectContaining({ applied: false }));
      expect(journal.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('blocks editing a non-pending request', async () => {
      const entity = baseRequest();
      entity.status = GradeRequestStatus.APPROVED;
      requests.findOne.mockResolvedValue(entity);
      await expect(service.update(reqId, { requestedGrade: 4 }, actor)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('returns items, meta and per-kind stats', async () => {
      const qb: Record<string, jest.Mock> = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[baseRequest()], 1]),
        getCount: jest.fn().mockResolvedValue(1),
      };
      requests.createQueryBuilder.mockReturnValue(qb as never);

      const res = await service.findAll({ page: 1, limit: 20, kind: GradeRequestKind.ASSESSMENT });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].studentName).toBe('Valiyev Ali');
      expect(res.meta.total).toBe(1);
      expect(res.stats.totalCount).toBe(1);
    });
  });
});
