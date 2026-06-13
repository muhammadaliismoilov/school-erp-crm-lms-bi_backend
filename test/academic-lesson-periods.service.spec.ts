import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { AcademicService } from '../src/modules/academic/academic.service';
import type { AcademicYear } from '../src/modules/academic/entities/academic-year.entity';
import type { LessonPeriod } from '../src/modules/academic/entities/lesson-period.entity';
import type { Quarter } from '../src/modules/academic/entities/quarter.entity';
import type { SchoolClass } from '../src/modules/academic/entities/school-class.entity';
import type { Subject } from '../src/modules/academic/entities/subject.entity';

const emptyRepository = <T extends object>(): Repository<T> => ({} as Repository<T>);

describe('AcademicService lesson periods CRUD', () => {
  const lessonPeriodId = 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7';

  let lessonPeriods: jest.Mocked<
    Pick<Repository<LessonPeriod>, 'create' | 'save' | 'find' | 'findOne' | 'softDelete'>
  >;
  let service: AcademicService;

  beforeEach(() => {
    lessonPeriods = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };

    service = new AcademicService(
      emptyRepository<AcademicYear>(),
      emptyRepository<Quarter>(),
      lessonPeriods as unknown as Repository<LessonPeriod>,
      emptyRepository<Subject>(),
      emptyRepository<SchoolClass>(),
    );
  });

  it('creates a lesson period with generated code and normalized times', async () => {
    lessonPeriods.findOne.mockResolvedValue(null);
    lessonPeriods.create.mockImplementation((value) => value as LessonPeriod);
    lessonPeriods.save.mockImplementation(async (value) => ({ id: lessonPeriodId, ...value }) as LessonPeriod);

    const result = await service.createLessonPeriod({
      lessonNumber: 1,
      startTime: '08:00',
      endTime: '08:45',
    });

    expect(result).toMatchObject({
      id: lessonPeriodId,
      code: '1-Dars',
      lessonNumber: 1,
      startTime: '08:00',
      endTime: '08:45',
      order: 1,
    });
    expect(lessonPeriods.create).toHaveBeenCalledWith({
      code: '1-Dars',
      startTime: '08:00:00',
      endTime: '08:45:00',
      order: 1,
    });
  });

  it('rejects lesson periods where end time is not after start time', async () => {
    await expect(
      service.createLessonPeriod({
        lessonNumber: 2,
        startTime: '09:30',
        endTime: '09:30',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(lessonPeriods.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate lesson numbers', async () => {
    lessonPeriods.findOne.mockResolvedValue({ id: lessonPeriodId } as LessonPeriod);

    await expect(
      service.createLessonPeriod({
        lessonNumber: 1,
        startTime: '08:00',
        endTime: '08:45',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects overlapping lesson period times', async () => {
    lessonPeriods.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: lessonPeriodId } as LessonPeriod);

    await expect(
      service.createLessonPeriod({
        lessonNumber: 2,
        startTime: '08:30',
        endTime: '09:15',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists lesson periods ordered by lesson number with stats', async () => {
    lessonPeriods.find.mockResolvedValue([
      { id: 'a', code: '1-Dars', startTime: '08:00:00', endTime: '08:45:00', order: 1 },
      { id: 'b', code: '2-Dars', startTime: '08:45:00', endTime: '09:30:00', order: 2 },
    ] as LessonPeriod[]);

    const result = await service.listLessonPeriods();

    expect(lessonPeriods.find).toHaveBeenCalledWith({ order: { order: 'ASC' } });
    expect(result.items).toHaveLength(2);
    expect(result.stats).toEqual({ total: 2, firstStartTime: '08:00' });
  });

  it('returns null firstStartTime when there are no lesson periods', async () => {
    lessonPeriods.find.mockResolvedValue([]);

    const result = await service.listLessonPeriods();

    expect(result.stats).toEqual({ total: 0, firstStartTime: null });
  });

  it('throws NotFoundException when a lesson period does not exist', async () => {
    lessonPeriods.findOne.mockResolvedValue(null);

    await expect(service.findLessonPeriod(lessonPeriodId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an existing lesson period and regenerates code from lesson number', async () => {
    const existing = {
      id: lessonPeriodId,
      code: '1-Dars',
      startTime: '08:00:00',
      endTime: '08:45:00',
      order: 1,
    } as LessonPeriod;
    lessonPeriods.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    lessonPeriods.save.mockImplementation(async (value) => value as LessonPeriod);

    const result = await service.updateLessonPeriod(lessonPeriodId, {
      lessonNumber: 2,
      startTime: '08:50',
      endTime: '09:35',
    });

    expect(result).toMatchObject({
      code: '2-Dars',
      lessonNumber: 2,
      startTime: '08:50',
      endTime: '09:35',
      order: 2,
    });
    expect(lessonPeriods.save).toHaveBeenCalledWith(existing);
  });

  it('soft deletes an existing lesson period', async () => {
    lessonPeriods.findOne.mockResolvedValue({ id: lessonPeriodId } as LessonPeriod);
    lessonPeriods.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.deleteLessonPeriod(lessonPeriodId);

    expect(lessonPeriods.softDelete).toHaveBeenCalledWith(lessonPeriodId);
  });
});
