import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { VacancyService } from '../src/modules/hr/vacancy.service';
import type { Vacancy } from '../src/modules/hr/entities/vacancy.entity';
import { VacancyStatus } from '../src/modules/hr/enums/hr.enums';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeVacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return {
    id: 'v-1',
    title: 'Matematika o‘qituvchisi',
    status: VacancyStatus.OPEN,
    departmentId: null,
    department: null,
    positionId: null,
    position: null,
    recruiterId: null,
    recruiter: null,
    minSalary: 5000000,
    maxSalary: 10000000,
    responsibilities: null,
    requirements: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Vacancy;
}

describe('VacancyService', () => {
  let vacancies: jest.Mocked<
    Pick<Repository<Vacancy>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>
  >;
  let service: VacancyService;

  beforeEach(() => {
    vacancies = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'v-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new VacancyService(vacancies as unknown as Repository<Vacancy>, new TenantContextService());
  });

  describe('createVacancy', () => {
    it('creates an open vacancy and resolves recruiter name', async () => {
      vacancies.findOne.mockResolvedValue(
        makeVacancy({ recruiter: { firstName: 'Ali', lastName: 'Valiyev' } as StaffMember, recruiterId: 's-1' }),
      );
      const res = await service.createVacancy({ title: 'Matematika o‘qituvchisi' });
      expect(vacancies.create.mock.calls[0][0].status).toBe(VacancyStatus.OPEN);
      expect(res.recruiterName).toBe('Valiyev Ali');
      expect(res.minSalary).toBe(5000000);
    });

    it('rejects max salary below min salary', async () => {
      await expect(
        service.createVacancy({ title: 'X', minSalary: 9000000, maxSalary: 5000000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateVacancy', () => {
    it('updates the status to closed', async () => {
      vacancies.findOne
        .mockResolvedValueOnce(makeVacancy())
        .mockResolvedValueOnce(makeVacancy({ status: VacancyStatus.CLOSED }));
      const res = await service.updateVacancy('v-1', { status: VacancyStatus.CLOSED });
      expect(res.status).toBe(VacancyStatus.CLOSED);
    });

    it('throws when missing', async () => {
      vacancies.findOne.mockResolvedValue(null);
      await expect(service.updateVacancy('x', { title: 'Z' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
