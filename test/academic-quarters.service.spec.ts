import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { Course } from '../src/modules/academic/entities/course.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';
import { QuarterStatus } from '../src/modules/academic/enums/quarter-status.enum';

const emptyRepository = <T extends object>(): Repository<T> => ({} as Repository<T>);

describe('AcademicService quarters', () => {
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
  let courses: jest.Mocked<Pick<Repository<Course>, 'count'>>;
  let service: AcademicService;

  beforeEach(() => {
    // Status sanadan hisoblanadi — testlar deterministik bo'lishi uchun vaqtni muzlatamiz.
    jest.useFakeTimers().setSystemTime(new Date('2025-10-15T09:00:00.000Z'));

    academicYears = { findOne: jest.fn() };
    quarters = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    courses = { count: jest.fn().mockResolvedValue(0) };

    service = new AcademicService(
      academicYears as unknown as Repository<AcademicYear>,
      quarters as unknown as Repository<Quarter>,
      emptyRepository<LessonPeriod>(),
      emptyRepository<Subject>(),
      emptyRepository<SchoolClass>(),
      undefined,
      undefined,
      undefined,
      courses as unknown as Repository<Course>,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a quarter with generated name and date-derived status', async () => {
    academicYears.findOne.mockResolvedValue(academicYear);
    quarters.findOne.mockResolvedValue(null);
    quarters.create.mockImplementation((value) => value as Quarter);
    quarters.save.mockImplementation(async (value) => ({ id: quarterId, ...value }) as Quarter);

    const result = await service.createQuarter({
      academicYearId,
      quarterNumber: 1,
      startDate: '2025-09-01',
      endDate: '2025-11-05',
    });

    expect(result.name).toBe('1-chorak');
    expect(result.quarterNumber).toBe(1);
    // 2025-10-15 sanasi 09-01..11-05 oralig'ida → joriy.
    expect(result.status).toBe(QuarterStatus.CURRENT);
    expect(result.academicYear).toEqual({ id: academicYearId, name: '2025/2026' });
  });

  it.each([
    ['2025-09-01', '2025-09-30', QuarterStatus.COMPLETED],
    ['2025-09-01', '2025-11-05', QuarterStatus.CURRENT],
    ['2026-01-10', '2026-03-20', QuarterStatus.PLANNED],
  ])('derives status %s..%s as %s', async (startDate, endDate, expected) => {
    academicYears.findOne.mockResolvedValue(academicYear);
    quarters.findOne.mockResolvedValue(null);
    quarters.create.mockImplementation((value) => value as Quarter);
    quarters.save.mockImplementation(async (value) => ({ id: quarterId, ...value }) as Quarter);

    const result = await service.createQuarter({ academicYearId, quarterNumber: 1, startDate, endDate });

    expect(result.status).toBe(expected);
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

  it('rejects a duplicate quarter number in the same academic year', async () => {
    academicYears.findOne.mockResolvedValue(academicYear);
    quarters.findOne.mockResolvedValueOnce({ id: quarterId } as Quarter);

    await expect(
      service.createQuarter({
        academicYearId,
        quarterNumber: 1,
        startDate: '2025-09-01',
        endDate: '2025-11-05',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
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

  it('lists quarters ordered by number with status stats', async () => {
    quarters.find.mockResolvedValue([
      {
        id: 'q1',
        academicYearId,
        quarterNumber: 1,
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        name: { uz: '1-chorak' },
        academicYear,
      },
      {
        id: 'q2',
        academicYearId,
        quarterNumber: 2,
        startDate: '2025-10-01',
        endDate: '2025-12-30',
        name: { uz: '2-chorak' },
        academicYear,
      },
    ] as unknown as Quarter[]);

    const result = await service.listQuarters({ academicYearId });

    expect(quarters.find).toHaveBeenCalledWith({
      where: { academicYearId },
      relations: { academicYear: true },
      order: { quarterNumber: 'ASC' },
    });
    expect(result.items).toHaveLength(2);
    // 2025-10-15 da: 1-chorak yakunlangan, 2-chorak joriy.
    expect(result.stats).toEqual({ total: 2, planned: 0, current: 1, completed: 1 });
  });

  it('throws NotFoundException when a quarter does not exist', async () => {
    quarters.findOne.mockResolvedValue(null);

    await expect(service.findQuarter(quarterId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a quarter and regenerates its name', async () => {
    const existing = {
      id: quarterId,
      academicYearId,
      quarterNumber: 1,
      startDate: '2025-09-01',
      endDate: '2025-11-05',
      name: { uz: '1-chorak', ru: '1-я четверть', en: 'Quarter 1' },
      academicYear,
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
    });

    expect(result.quarterNumber).toBe(2);
    expect(result.name).toBe('2-chorak');
  });

  it('soft deletes a quarter without courses', async () => {
    quarters.findOne.mockResolvedValue({ id: quarterId, quarterNumber: 1 } as Quarter);
    courses.count.mockResolvedValue(0);
    quarters.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.deleteQuarter(quarterId);

    expect(quarters.softDelete).toHaveBeenCalledWith(quarterId);
  });

  it('blocks deleting a quarter that still has courses', async () => {
    quarters.findOne.mockResolvedValue({ id: quarterId, quarterNumber: 1 } as Quarter);
    courses.count.mockResolvedValue(3);

    await expect(service.deleteQuarter(quarterId)).rejects.toBeInstanceOf(ConflictException);
    expect(quarters.softDelete).not.toHaveBeenCalled();
  });
});
