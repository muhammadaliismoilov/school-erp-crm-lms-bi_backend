import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { TeacherService } from '../src/modules/hr/teacher.service';
import { Teacher } from '../src/modules/hr/entities/teacher.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import {
  TeacherCategory,
  TeacherEmploymentType,
  TeacherStatus,
  TeacherWorkType,
} from '../src/modules/hr/enums/hr.enums';

function makeTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: 't-1',
    staffMemberId: null,
    firstName: 'Aziz',
    lastName: 'Karimov',
    middleName: null,
    gender: null,
    birthDate: null,
    documentNumber: null,
    pinfl: null,
    phone: null,
    email: null,
    workType: TeacherWorkType.FULL,
    degree: null,
    employmentType: TeacherEmploymentType.PRIMARY,
    status: TeacherStatus.ACTIVE,
    category: TeacherCategory.OLIY,
    experienceYears: 4,
    ratePerLesson: 0,
    startDate: null,
    endDate: null,
    isSubjectTeacher: true,
    isAssistantTeacher: false,
    isMbr: false,
    isExtraLesson: false,
    isClassLeader: false,
    note: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Teacher;
}

describe('TeacherService', () => {
  let teachers: jest.Mocked<
    Pick<Repository<Teacher>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>
  >;
  let staff: jest.Mocked<Pick<Repository<StaffMember>, 'findOne'>>;
  let service: TeacherService;

  beforeEach(() => {
    teachers = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 't-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    staff = { findOne: jest.fn() };
    service = new TeacherService(
      teachers as unknown as Repository<Teacher>,
      staff as unknown as Repository<StaffMember>,
    );
  });

  describe('createTeacher', () => {
    it('builds a "Lastname Firstname" full name and applies defaults', async () => {
      teachers.findOne.mockResolvedValue(makeTeacher());
      const res = await service.createTeacher({ firstName: 'Aziz', lastName: 'Karimov' });

      const created = teachers.create.mock.calls[0][0];
      expect(created.workType).toBe(TeacherWorkType.FULL);
      expect(created.isSubjectTeacher).toBe(true);
      expect(res.fullName).toBe('Karimov Aziz');
    });

    it('rejects an end date before the start date', async () => {
      await expect(
        service.createTeacher({
          firstName: 'A',
          lastName: 'B',
          startDate: '2026-09-01',
          endDate: '2026-06-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown linked staff member', async () => {
      staff.findOne.mockResolvedValue(null);
      await expect(
        service.createTeacher({ firstName: 'A', lastName: 'B', staffMemberId: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateTeacher', () => {
    it('updates the category and rate', async () => {
      teachers.findOne.mockResolvedValueOnce(makeTeacher()).mockResolvedValueOnce(
        makeTeacher({ category: TeacherCategory.FIRST, ratePerLesson: 50000 }),
      );
      const res = await service.updateTeacher('t-1', {
        category: TeacherCategory.FIRST,
        ratePerLesson: 50000,
      });
      expect(res.category).toBe(TeacherCategory.FIRST);
      expect(res.ratePerLesson).toBe(50000);
    });

    it('throws when the teacher does not exist', async () => {
      teachers.findOne.mockResolvedValue(null);
      await expect(service.updateTeacher('x', { firstName: 'Z' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('removeTeacher', () => {
    it('soft-deletes an existing teacher', async () => {
      teachers.findOne.mockResolvedValue(makeTeacher());
      await service.removeTeacher('t-1');
      expect(teachers.softDelete).toHaveBeenCalledWith('t-1');
    });
  });
});
