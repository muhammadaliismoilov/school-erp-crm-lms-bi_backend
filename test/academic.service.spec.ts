import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';

const emptyRepository = <T extends object>(): Repository<T> => ({} as Repository<T>);

describe('AcademicService academic years CRUD', () => {
  let academicYears: jest.Mocked<
    Pick<Repository<AcademicYear>, 'create' | 'save' | 'find' | 'findOne' | 'softDelete'>
  >;
  let service: AcademicService;

  beforeEach(() => {
    academicYears = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };

    service = new AcademicService(
      academicYears as unknown as Repository<AcademicYear>,
      emptyRepository<Quarter>(),
      emptyRepository<LessonPeriod>(),
      emptyRepository<Subject>(),
      emptyRepository<SchoolClass>(),
    );
  });

  it('returns a single academic year by id', async () => {
    const academicYear = {
      id: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
      name: '2025/2026',
      startDate: '2025-09-01',
      endDate: '2026-06-15',
      isCurrent: true,
    } as AcademicYear;
    academicYears.findOne.mockResolvedValue(academicYear);

    await expect(service.findAcademicYear(academicYear.id)).resolves.toBe(academicYear);
    expect(academicYears.findOne).toHaveBeenCalledWith({ where: { id: academicYear.id } });
  });

  it('throws NotFoundException when an academic year does not exist', async () => {
    academicYears.findOne.mockResolvedValue(null);

    await expect(
      service.findAcademicYear('8cf35a94-92b4-4f1a-8a7a-90a78003892d'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing academic year', async () => {
    const academicYear = {
      id: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
      name: '2025/2026',
      startDate: '2025-09-01',
      endDate: '2026-06-15',
      isCurrent: true,
    } as AcademicYear;
    academicYears.findOne.mockResolvedValue(academicYear);
    academicYears.save.mockImplementation(async (value) => value as AcademicYear);

    const result = await service.updateAcademicYear(academicYear.id, {
      endDate: '2026-06-20',
      isCurrent: false,
    });

    expect(result.endDate).toBe('2026-06-20');
    expect(result.isCurrent).toBe(false);
    expect(academicYears.save).toHaveBeenCalledWith(academicYear);
  });

  it('soft deletes an existing academic year', async () => {
    const academicYear = {
      id: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
      name: '2025/2026',
    } as AcademicYear;
    academicYears.findOne.mockResolvedValue(academicYear);
    academicYears.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.deleteAcademicYear(academicYear.id);

    expect(academicYears.softDelete).toHaveBeenCalledWith(academicYear.id);
  });
});
