import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { TeacherService } from '../src/modules/hr/teacher.service';
import type { StaffService } from '../src/modules/hr/staff.service';
import { Teacher } from '../src/modules/hr/entities/teacher.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import {
  QualificationCategory,
  TeacherEmploymentType,
  TeacherStatus,
  TeacherWorkType,
} from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

/** Shaxsiy ma'lumot manbasi — bog'langan xodim. */
function makeStaff(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 'sm-1',
    firstName: 'Aziz',
    lastName: 'Karimov',
    middleName: null,
    gender: null,
    birthDate: null,
    passportSeries: null,
    pinfl: null,
    phone: null,
    email: null,
    qualificationCategory: QualificationCategory.OLIY,
    ...overrides,
  } as StaffMember;
}

function makeTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: 't-1',
    staffMemberId: 'sm-1',
    staffMember: makeStaff(),
    workType: TeacherWorkType.FULL,
    degree: null,
    employmentType: TeacherEmploymentType.PRIMARY,
    status: TeacherStatus.ACTIVE,
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
  let staff: jest.Mocked<Pick<Repository<StaffMember>, 'findOne' | 'softDelete'>>;
  let staffService: jest.Mocked<Pick<StaffService, 'createBareStaff' | 'updateStaff'>>;
  let service: TeacherService;

  beforeEach(() => {
    teachers = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 't-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    staff = { findOne: jest.fn(), softDelete: jest.fn() };
    staffService = {
      createBareStaff: jest.fn().mockResolvedValue({ id: 'sm-1' } as StaffMember),
      updateStaff: jest.fn().mockResolvedValue({ id: 'sm-1' } as StaffMember),
    };
    service = new TeacherService(
      teachers as unknown as Repository<Teacher>,
      staff as unknown as Repository<StaffMember>,
      staffService as unknown as StaffService,
      new TenantContextService(),
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

    it('auto-creates and links a staff member when none is provided', async () => {
      teachers.findOne.mockResolvedValue(makeTeacher({ staffMemberId: 'sm-1' }));
      await service.createTeacher({ firstName: 'Aziz', lastName: 'Karimov' });

      expect(staffService.createBareStaff).toHaveBeenCalledTimes(1);
      const created = teachers.create.mock.calls[0][0];
      expect(created.staffMemberId).toBe('sm-1');
    });

    it('reuses an existing staff member without creating a new one', async () => {
      staff.findOne.mockResolvedValue({ id: 'sm-9' } as StaffMember);
      teachers.findOne.mockResolvedValue(makeTeacher({ staffMemberId: 'sm-9' }));
      await service.createTeacher({ firstName: 'A', lastName: 'B', staffMemberId: 'sm-9' });

      expect(staffService.createBareStaff).not.toHaveBeenCalled();
      const created = teachers.create.mock.calls[0][0];
      expect(created.staffMemberId).toBe('sm-9');
    });
  });

  describe('updateTeacher', () => {
    it('updates the rate and syncs the category to the linked staff member', async () => {
      teachers.findOne.mockResolvedValueOnce(makeTeacher()).mockResolvedValueOnce(
        makeTeacher({
          ratePerLesson: 50000,
          staffMember: makeStaff({ qualificationCategory: QualificationCategory.BIRINCHI }),
        }),
      );
      const res = await service.updateTeacher('t-1', {
        category: QualificationCategory.BIRINCHI,
        ratePerLesson: 50000,
      });
      // Malaka toifasi xodimga (yagona manba) yuboriladi.
      expect(staffService.updateStaff).toHaveBeenCalledWith(
        'sm-1',
        expect.objectContaining({ qualificationCategory: QualificationCategory.BIRINCHI }),
      );
      expect(res.category).toBe(QualificationCategory.BIRINCHI);
      expect(res.ratePerLesson).toBe(50000);
    });

    it('throws when the teacher does not exist', async () => {
      teachers.findOne.mockResolvedValue(null);
      await expect(service.updateTeacher('x', { firstName: 'Z' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('propagates personal fields to the linked staff member', async () => {
      teachers.findOne.mockResolvedValue(makeTeacher());
      await service.updateTeacher('t-1', { firstName: 'Bekzod', documentNumber: 'AB123' });

      expect(staffService.updateStaff).toHaveBeenCalledTimes(1);
      const [staffId, patch] = staffService.updateStaff.mock.calls[0];
      expect(staffId).toBe('sm-1');
      // documentNumber -> passportSeries map qilinadi.
      expect(patch).toMatchObject({ firstName: 'Bekzod', passportSeries: 'AB123' });
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
