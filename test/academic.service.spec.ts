import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';

const emptyRepository = <T extends object>(): Repository<T> => ({} as Repository<T>);
const yearId = '8cf35a94-92b4-4f1a-8a7a-90a78003892d';

const sampleYear = (overrides: Partial<AcademicYear> = {}): AcademicYear =>
  ({
    id: yearId,
    name: '2025/2026',
    startDate: '2025-09-01',
    endDate: '2026-06-15',
    isCurrent: true,
    ...overrides,
  }) as AcademicYear;

describe('AcademicService academic years', () => {
  let academicYears: jest.Mocked<
    Pick<Repository<AcademicYear>, 'create' | 'save' | 'find' | 'findOne' | 'update' | 'count' | 'softDelete'>
  >;
  let quarters: jest.Mocked<Pick<Repository<Quarter>, 'count'>>;
  let service: AcademicService;

  beforeEach(() => {
    academicYears = {
      create: jest.fn().mockImplementation((value) => value as AcademicYear),
      save: jest.fn().mockImplementation(async (value) => ({ id: yearId, ...value }) as AcademicYear),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] }),
      count: jest.fn().mockResolvedValue(0),
      softDelete: jest.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    };
    quarters = { count: jest.fn().mockResolvedValue(0) };

    service = new AcademicService(
      academicYears as unknown as Repository<AcademicYear>,
      quarters as unknown as Repository<Quarter>,
      emptyRepository<LessonPeriod>(),
      emptyRepository<Subject>(),
      emptyRepository<SchoolClass>(),
    );
  });

  it('returns a single academic year by id', async () => {
    const year = sampleYear();
    academicYears.findOne.mockResolvedValue(year);

    await expect(service.findAcademicYear(yearId)).resolves.toBe(year);
    expect(academicYears.findOne).toHaveBeenCalledWith({ where: { id: yearId } });
  });

  it('throws NotFoundException when an academic year does not exist', async () => {
    academicYears.findOne.mockResolvedValue(null);

    await expect(service.findAcademicYear(yearId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates the first year as current and clears others', async () => {
    academicYears.findOne.mockResolvedValue(null); // name free + no overlap
    academicYears.count.mockResolvedValue(0);

    const result = await service.createAcademicYear({
      name: '2025/2026',
      startDate: '2025-09-01',
      endDate: '2026-06-15',
    });

    expect(result.isCurrent).toBe(true);
    expect(academicYears.update).toHaveBeenCalled(); // unset others
  });

  it('rejects a year whose start is not before end', async () => {
    await expect(
      service.createAcademicYear({ name: 'x', startDate: '2026-06-13', endDate: '2026-06-13' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an overlapping year', async () => {
    academicYears.findOne
      .mockResolvedValueOnce(null) // name available
      .mockResolvedValueOnce(sampleYear()); // overlap found

    await expect(
      service.createAcademicYear({ name: '2026/2027', startDate: '2026-01-01', endDate: '2026-12-31' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a duplicate year name', async () => {
    academicYears.findOne.mockResolvedValueOnce(sampleYear()); // name taken

    await expect(
      service.createAcademicYear({ name: '2025/2026', startDate: '2027-09-01', endDate: '2028-06-15' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a year and validates the new range', async () => {
    academicYears.findOne
      .mockResolvedValueOnce(sampleYear()) // findAcademicYear
      .mockResolvedValueOnce(null); // no overlap

    const result = await service.updateAcademicYear(yearId, { endDate: '2026-06-20', isCurrent: false });

    expect(result.endDate).toBe('2026-06-20');
    expect(result.isCurrent).toBe(false);
  });

  it('marks a year current and unsets the others', async () => {
    academicYears.findOne.mockResolvedValue(sampleYear({ isCurrent: false }));

    const result = await service.setCurrentAcademicYear(yearId);

    expect(result.isCurrent).toBe(true);
    expect(academicYears.update).toHaveBeenCalledWith(
      expect.objectContaining({ isCurrent: true }),
      { isCurrent: false },
    );
  });

  it('soft deletes a non-current year without quarters', async () => {
    academicYears.findOne.mockResolvedValue(sampleYear({ isCurrent: false }));
    quarters.count.mockResolvedValue(0);

    await service.deleteAcademicYear(yearId);

    expect(academicYears.softDelete).toHaveBeenCalledWith(yearId);
  });

  it('refuses to delete the current year', async () => {
    academicYears.findOne.mockResolvedValue(sampleYear({ isCurrent: true }));

    await expect(service.deleteAcademicYear(yearId)).rejects.toBeInstanceOf(ConflictException);
    expect(academicYears.softDelete).not.toHaveBeenCalled();
  });

  it('refuses to delete a year that has quarters', async () => {
    academicYears.findOne.mockResolvedValue(sampleYear({ isCurrent: false }));
    quarters.count.mockResolvedValue(3);

    await expect(service.deleteAcademicYear(yearId)).rejects.toBeInstanceOf(ConflictException);
    expect(academicYears.softDelete).not.toHaveBeenCalled();
  });

  it('lists years with dashboard stats', async () => {
    academicYears.find.mockResolvedValue([sampleYear({ isCurrent: true })]);

    const result = await service.listAcademicYears();

    expect(result.items).toHaveLength(1);
    expect(result.stats.totalCount).toBe(1);
    expect(result.stats.currentYearName).toBe('2025/2026');
    expect(result.stats.currentCalendarYear).toBe(new Date().getFullYear());
  });
});
