import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuditService } from '../src/modules/audit/audit.service';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Student } from '../src/modules/students/entities/student.entity';
import { ParentCommsService } from '../src/modules/parent-comms/parent-comms.service';
import type { TenantContextService } from '../src/common/tenant/tenant-context.service';
import {
  CommunicationSentiment,
  ParentCommunication,
  ParentType,
} from '../src/modules/parent-comms/entities/parent-communication.entity';

describe('ParentCommsService', () => {
  const actor = { userId: 'staff-1', ipAddress: '127.0.0.1' };
  const studentId = '11111111-1111-4111-8111-111111111111';
  const classId = '22222222-2222-4222-8222-222222222222';
  const commId = '33333333-3333-4333-8333-333333333333';

  const student = { id: studentId, firstName: 'Feruza', lastName: 'Qodirova', currentClassId: classId } as Student;

  const baseComm = (): ParentCommunication =>
    ({
      id: commId,
      studentId,
      classId,
      parentId: null,
      parentType: ParentType.MOTHER,
      sentiment: CommunicationSentiment.POSITIVE,
      tutorId: null,
      createdById: 'staff-1',
      educationScore: 80,
      classLeaderScore: 75,
      extracurricularScore: 40,
      organizationalScore: 50,
      purpose: 'Suhbat',
      notes: 'Izoh',
      communicationDate: new Date('2026-06-19T10:00:00.000Z'),
      student,
      class: { id: classId, gradeLevel: 2, section: 'A' } as SchoolClass,
      parent: null,
      tutor: null,
      createdBy: { id: 'staff-1', firstName: 'Javoxir', lastName: 'Aliyev' },
      createdAt: new Date('2026-06-19T10:00:00.000Z'),
      updatedAt: new Date('2026-06-19T10:00:00.000Z'),
      deletedAt: null,
      version: 1,
    }) as ParentCommunication;

  let comms: jest.Mocked<
    Pick<Repository<ParentCommunication>, 'create' | 'save' | 'findOne' | 'softDelete' | 'createQueryBuilder'>
  >;
  let students: { findOne: jest.Mock };
  let classes: { findOne: jest.Mock };
  let audit: { log: jest.Mock };
  let service: ParentCommsService;

  beforeEach(() => {
    comms = {
      create: jest.fn((x) => x as ParentCommunication),
      save: jest.fn(async (x) => x as ParentCommunication),
      findOne: jest.fn(),
      softDelete: jest.fn(async () => ({ affected: 1 }) as never),
      createQueryBuilder: jest.fn(),
    } as never;
    students = { findOne: jest.fn().mockResolvedValue(student) };
    classes = { findOne: jest.fn().mockResolvedValue({ id: classId }) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new ParentCommsService(
      comms as never as Repository<ParentCommunication>,
      students as never as Repository<Student>,
      classes as never as Repository<SchoolClass>,
      audit as never as AuditService,
      undefined as unknown as TenantContextService,
    );
  });

  describe('create', () => {
    it('saves a communication with the staff as creator and defaults the class', async () => {
      comms.findOne.mockResolvedValue(baseComm());
      const result = await service.create(
        {
          studentId,
          parentType: ParentType.MOTHER,
          sentiment: CommunicationSentiment.POSITIVE,
          educationScore: 80,
        },
        actor,
      );
      expect(comms.save).toHaveBeenCalledWith(
        expect.objectContaining({ createdById: 'staff-1', classId, studentId }),
      );
      expect(result.studentName).toBe('Qodirova Feruza');
      expect(result.className).toBe('2-A');
      expect(result.staffName).toBe('Aliyev Javoxir');
      expect(audit.log).toHaveBeenCalled();
    });

    it('throws NotFound when the student is missing', async () => {
      students.findOne.mockResolvedValue(null);
      await expect(
        service.create({ studentId, parentType: ParentType.OTHER, sentiment: CommunicationSentiment.NEUTRAL }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('defaults the communicationDate to now when omitted', async () => {
      comms.findOne.mockResolvedValue(baseComm());
      await service.create(
        { studentId, parentType: ParentType.FATHER, sentiment: CommunicationSentiment.NEGATIVE },
        actor,
      );
      const saved = comms.save.mock.calls[0][0] as ParentCommunication;
      expect(saved.communicationDate).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('updates sentiment and notes', async () => {
      comms.findOne.mockResolvedValue(baseComm());
      const result = await service.update(
        commId,
        { sentiment: CommunicationSentiment.NEGATIVE, notes: '  yangi izoh  ' },
        actor,
      );
      expect(comms.save).toHaveBeenCalledWith(
        expect.objectContaining({ sentiment: CommunicationSentiment.NEGATIVE, notes: 'yangi izoh' }),
      );
      expect(result.id).toBe(commId);
    });

    it('throws NotFound for a missing record', async () => {
      comms.findOne.mockResolvedValue(null);
      await expect(service.update(commId, { notes: 'x' }, actor)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes and audits', async () => {
      comms.findOne.mockResolvedValue(baseComm());
      await service.remove(commId, actor);
      expect(comms.softDelete).toHaveBeenCalledWith(commId);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'parent_comm.archived', entity: 'parent_communication' }),
      );
    });
  });

  describe('findAll', () => {
    it('returns items, meta and sentiment stats', async () => {
      const qb: Record<string, jest.Mock> = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[baseComm()], 1]),
        getCount: jest.fn().mockResolvedValue(1),
      };
      comms.createQueryBuilder.mockReturnValue(qb as never);

      const res = await service.findAll({ page: 1, limit: 20, sentiment: CommunicationSentiment.POSITIVE });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].sentiment).toBe(CommunicationSentiment.POSITIVE);
      expect(res.meta.total).toBe(1);
      expect(res.stats.totalCount).toBe(1);
    });
  });
});
