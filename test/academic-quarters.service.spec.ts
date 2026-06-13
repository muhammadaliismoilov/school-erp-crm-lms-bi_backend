import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import { QuarterStatus } from '../src/modules/academic/enums/quarter-status.enum';

const emptyRepository = <T extends object>(): Repository<T> => ({} as Repository<T>);

describe('AcademicService quarters CRUD', () => {
  const academicYearId = '8cf35a94-92b4-4f1a-8a7a-90a78003892d';
  const quarterId = '5c617a45-57a4-4864-89c8-96e299173908';
  const academicYear = {
    id: academicYearId,
    name: '2025/2026',
    startDate: '2025-09-01',
    endDate: '2026-06-15',
  } as AcademicYear;

  let academicYears: jest.Mocked<Pick<Repository<AcademicYear>, 'findOne'>>;
  let quarters: jest.Mocked<
    Pick<Repository<Quarter>, 'create' | 'save' | 'find' | 'findOne' | 'softDelete'>
  >;
  let service: AcademicService;

  beforeEach(() => {
    academicYears = {
      findOne: jest.fn(),
    };
    quarters = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };

    service = new AcademicService(
      academicYears as unknown as Repository<AcademicYear>,
      quarters as unknown as Repository<Quarter>,
      emptyRepository<LessonPeriod>(),
      emptyRepository<Subject>(),
      emptyRepository<SchoolClass>(),
    );
  });

  it('creates a quarter with generated localized name', async () => {
    academicYears.findOne.mockResolvedValue(academicYear);
    quarters.findOne.mockResolvedValue(null);
    quarters.create.mockImplementation((value) => value as Quarter);
    quarters.save.mockImplementation(async (value) => ({ id: quarterId, ...value }) as Quarter);

    const result = await service.createQuarter({
      academicYearId,
      quarterNumber: 1,
      startDate: '2025-09-01',
      endDate: '2025-11-05',
      status: QuarterStatus.COMPLETED,
    });

    expect(result.name.uz).toBe('1-chorak');
    expect(result.quarterNumber).toBe(1);
    expect(quarters.create).toHaveBeenCalledWith(
      expect.objectContaining({
        academicYearId,
        quarterNumber: 1,
        status: QuarterStatus.COMPLETED,
      }),
    );
  });

  it('rejects quarter dates outside the academic year range', async () => {
    academicYears.findOne.mockResolvedValue(academicYear);

    await expect(
      service.createQuarter({
        academicYearId,
        quarterNumber: 1,
        startDate: '2025-08-31',
        endDate: '2025-11-05',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(quarters.create).not.toHaveBeenCalled();
  });

  it('rejects overlapping quarters in the same academic year', async () => {
    academicYears.findOne.mockResolvedValue(academicYear);
    quarters.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: quarterId } as Quarter);

    await expect(
      service.createQuarter({
        academicYearId,
        quarterNumber: 2,
        startDate: '2025-10-15',
        endDate: '2025-12-30',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists quarters by academic year', async () => {
    quarters.find.mockResolvedValue([]);

    await service.findQuarters({ academicYearId });

    expect(quarters.find).toHaveBeenCalledWith({
      where: { academicYearId },
      relations: { academicYear: true },
      order: { startDate: 'ASC' },
    });
  });

  it('throws NotFoundException when a quarter does not exist', async () => {
    quarters.findOne.mockResolvedValue(null);

    await expect(service.findQuarter(quarterId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing quarter and regenerates its localized name', async () => {
    const existing = {
      id: quarterId,
      academicYearId,
      quarterNumber: 1,
      startDate: '2025-09-01',
      endDate: '2025-11-05',
      status: QuarterStatus.COMPLETED,
      name: { uz: '1-chorak', ru: '1-я четверть', en: 'Quarter 1' },
    } as Quarter;
    quarters.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    academicYears.findOne.mockResolvedValue(academicYear);
    quarters.save.mockImplementation(async (value) => value as Quarter);

    const result = await service.updateQuarter(quarterId, {
      quarterNumber: 2,
      startDate: '2025-11-10',
      endDate: '2025-12-30',
      status: QuarterStatus.PLANNED,
    });

    expect(result.quarterNumber).toBe(2);
    expect(result.name.uz).toBe('2-chorak');
    expect(quarters.save).toHaveBeenCalledWith(existing);
  });

  it('soft deletes an existing quarter', async () => {
    quarters.findOne.mockResolvedValue({ id: quarterId } as Quarter);
    quarters.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.deleteQuarter(quarterId);

    expect(quarters.softDelete).toHaveBeenCalledWith(quarterId);
  });
});
